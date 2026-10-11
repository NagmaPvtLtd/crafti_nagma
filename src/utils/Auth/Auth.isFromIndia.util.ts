import type { CountryResponse, AsnResponse, Reader } from "maxmind";
import maxmind from "maxmind";
import { open, GeoIpDbName } from "geolite2-redist";

/* =============================================================================
 *  isRequestFromIndia
 * =============================================================================
 *
 *  Determines whether an incoming request originates from India, using a
 *  fully offline detection stack. No API keys, no local database files to
 *  commit, no per-request HTTP calls.
 *
 *  Data sources
 *  ------------
 *
 *    1. GeoLite2-Country    Auto-downloaded and cached by geolite2-redist
 *                           on first use (~7 MB).
 *    2. GeoLite2-ASN        Same mechanism (~60 MB).
 *    3. Tor bulk exit list  Fetched from check.torproject.org once per
 *                           hour, held in memory (~15 KB).
 *    4. ASN keyword table   Static list, compiled into this module.
 *
 *  Evaluation order (first failure short-circuits)
 *  -----------------------------------------------
 *
 *    1. Dev bypass          Requests from localhost or private ranges in
 *                           NODE_ENV=development are allowed through so
 *                           the sign-in flow can be tested end-to-end.
 *    2. Country gate        GeoLite2-Country must resolve the IP to "IN".
 *    3. Tor gate            IP must not appear in the current Tor bulk
 *                           exit-node list.
 *    4. Hosting ASN gate    The IP's autonomous system organization name
 *                           must not contain any hosting, cloud, VPN, or
 *                           datacenter keyword.
 *
 *  Failure behaviour
 *  -----------------
 *
 *    • Missing client IP         Deny (fail-closed).
 *    • Lookup threw              Deny (fail-closed).
 *    • GeoLite2 download failed  Deny (fail-closed) — the outer try/catch
 *                                 covers the ensureInitialised() call.
 *    • Tor list fetch failed     Skip layer only; the set retains its
 *                                 previous contents (empty on cold start).
 *    • IP2Proxy removed          Not used in this version.
 *
 *  Coverage
 *  --------
 *
 *    Detected:
 *      - Tor exit nodes.
 *      - Commercial VPNs whose traffic egresses from a known hosting or
 *        cloud ASN (the majority of them).
 *      - Cloud VMs pretending to be residential users.
 *
 *    Not detected:
 *      - Residential proxies operating on real Indian ISP IP addresses.
 *      - Mobile proxies on Indian carrier networks.
 *
 *    The two undetected categories require a paid threat-intelligence
 *    feed such as IPQualityScore or IPRegistry.
 *
 *  Logging
 *  -------
 *
 *    Every decision emits a single `[geo]` prefixed line containing the
 *    resolved IP and every signal considered, so production logs can be
 *    filtered by IP, country, or flag without joining tables.
 * ========================================================================== */

/* -------------------------------------------------------------------------- */
/*  GeoLite2 readers (lazy, module-scoped singletons)                         */
/* -------------------------------------------------------------------------- */

let countryReader: Reader<CountryResponse> | null = null;
let asnReader: Reader<AsnResponse> | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Opens both GeoLite2 databases exactly once per process. Subsequent
 * calls return the same promise, so concurrent sign-ins during a cold
 * start do not trigger parallel downloads.
 */
async function ensureInitialised(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    countryReader = await open(GeoIpDbName.Country, (path: string) =>
      maxmind.open<CountryResponse>(path),
    );
    asnReader = await open(GeoIpDbName.ASN, (path: string) =>
      maxmind.open<AsnResponse>(path),
    );
  })();

  return initPromise;
}

/* -------------------------------------------------------------------------- */
/*  Tor bulk exit list                                                        */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Fetched from https://check.torproject.org/torbulkexitlist, which is a     */
/*  plain-text file listing one IPv4 or IPv6 address per line, refreshed      */
/*  hourly by the Tor Project. Held as an in-memory Set for O(1) lookups.     */
/*                                                                            */
/*  Refresh is fire-and-forget from the caller's perspective: the first       */
/*  request after boot may complete before the download finishes, in which    */
/*  case the Tor layer is skipped for that request only. Later requests in    */
/*  the same process benefit from the populated set.                          */
/* -------------------------------------------------------------------------- */

const TOR_EXIT_LIST_URL = "https://check.torproject.org/torbulkexitlist";
const TOR_REFRESH_MS = 60 * 60 * 1000;

let torExits: Set<string> = new Set();
let torFetchedAt = 0;
let torFetching: Promise<void> | null = null;

/**
 * Refreshes the Tor exit list if the cached copy is older than one hour.
 *
 * Concurrency: multiple callers within the TTL window return the same
 * in-flight promise, so a burst of sign-ins at cold start triggers at
 * most one HTTP request.
 *
 * Failure: a failed fetch leaves the previous set intact. If the list
 * has never been successfully loaded, the set is empty and the Tor
 * layer simply does not fire.
 */
async function loadTorExitList(): Promise<void> {
  const now = Date.now();
  if (now - torFetchedAt < TOR_REFRESH_MS) return;
  if (torFetching) return torFetching;

  torFetching = (async () => {
    try {
      const res = await fetch(TOR_EXIT_LIST_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const text = await res.text();
      torExits = new Set(
        text
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0 && !line.startsWith("#")),
      );
      torFetchedAt = Date.now();

      console.log(`[geo] Tor exit list loaded (${torExits.size} entries)`);
    } catch (err) {
      console.warn("[geo] Tor exit list refresh failed:", err);
    } finally {
      torFetching = null;
    }
  })();

  return torFetching;
}

/* -------------------------------------------------------------------------- */
/*  IP extraction                                                             */
/* -------------------------------------------------------------------------- */

const IS_DEV = process.env.NODE_ENV === "development";

function isPrivateIp(ip: string): boolean {
  return /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|127\.|::1|fc00:|fe80:)/.test(
    ip,
  );
}

function isLoopback(ip: string): boolean {
  return ip === "::1" || ip === "127.0.0.1" || ip.startsWith("127.");
}

/**
 * Extracts the client's public IP from the request headers.
 *
 * Preference order:
 *   1. x-forwarded-for   — first public IP in the comma-separated chain.
 *   2. x-real-ip         — nginx default.
 *   3. cf-connecting-ip  — Cloudflare.
 *   4. x-vercel-ip       — Vercel.
 *
 * Behind a reverse proxy, x-forwarded-for is a list of hops. The first
 * public entry is the client; entries before it are private-range hops
 * from the same network (e.g. the proxy itself). In development, all
 * entries may be private — the first non-empty entry is returned so the
 * caller's dev-bypass logic can act on it.
 */
function getClientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map((ip) => ip.trim());

    for (const ip of ips) {
      if (ip && !isPrivateIp(ip)) return ip;
    }

    const first = ips.find((ip) => ip.length > 0);
    if (first) return first;
  }

  return (
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    headers.get("x-vercel-ip") ||
    null
  );
}

/* -------------------------------------------------------------------------- */
/*  Hosting ASN keyword table                                                 */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  Matched case-insensitively against the ASN organization name returned     */
/*  by GeoLite2-ASN. Covers general infrastructure terms plus the largest     */
/*  cloud providers and VPN vendors that operate their own ASNs.              */
/*                                                                            */
/*  This is a heuristic, not a database. It catches the common case; it       */
/*  misses small regional hosting providers whose ASN org names do not        */
/*  contain any of these keywords.                                            */
/* -------------------------------------------------------------------------- */

const HOSTING_KEYWORDS = [
  "hosting",
  "datacenter",
  "data center",
  "cloud",
  "vps",
  "server",
  "amazon",
  "google cloud",
  "microsoft azure",
  "digitalocean",
  "linode",
  "ovh",
  "hetzner",
  "vultr",
  "contabo",
  "scaleway",
  "leaseweb",
  "m247",
  "nordvpn",
  "expressvpn",
  "surfshark",
  "cyberghost",
  "private internet access",
  "protonvpn",
  "mullvad",
];

/* -------------------------------------------------------------------------- */
/*  Main export                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Returns `true` when the request passes every geo and anonymiser gate,
 * `false` otherwise.
 *
 * The caller is expected to invoke this from the NextAuth `signIn`
 * callback and translate a `false` return into a redirect to the login
 * page with an appropriate error code.
 *
 * The function is safe to call concurrently. All shared state — the
 * GeoLite2 readers and the Tor exit set — is initialised through
 * deduplicated promises, so a cold start under load performs at most
 * one download per data source.
 *
 * @param headers  The request headers, obtained via `next/headers`.
 * @returns        `true` if the request is allowed, `false` otherwise.
 */
export default async function isRequestFromIndia(
  headers: Headers,
): Promise<boolean> {
  const ip = getClientIp(headers);

  /* ---- Development bypass ------------------------------------------- */
  /* Local requests have no meaningful public IP. Allowing them keeps
     the sign-in flow testable without a tunnel or a staging domain. */
  if (IS_DEV && (!ip || isLoopback(ip) || isPrivateIp(ip))) {
    console.log(`[geo] dev bypass (ip=${ip ?? "none"}) -> ALLOWED`);
    return true;
  }

  if (!ip) {
    console.warn("[geo] No client IP found — denying");
    return false;
  }

  try {
    await ensureInitialised();

    /* Kick off the Tor list refresh without awaiting it. The current
       request uses whatever is already in memory; later requests get
       the fresh list. */
    void loadTorExitList();

    /* ---- Country ---------------------------------------------------- */
    const country = countryReader?.get(ip);
    const countryCode = country?.country?.iso_code ?? null;

    /* ---- ASN organization ------------------------------------------ */
    const asn = asnReader?.get(ip);
    const asnOrg = asn?.autonomous_system_organization ?? null;

    /* ---- Tor exit --------------------------------------------------- */
    const isTor = torExits.has(ip);

    /* ---- Hosting ASN heuristic ------------------------------------- */
    const orgLower = (asnOrg ?? "").toLowerCase();
    const isHostingAsn = HOSTING_KEYWORDS.some((kw) => orgLower.includes(kw));

    const log =
      `[geo] ${ip} | country=${countryCode} | tor=${isTor} | ` +
      `hostingAsn=${isHostingAsn} | asnOrg=${asnOrg}`;

    /* ---- Gates ----------------------------------------------------- */
    if (countryCode !== "IN") {
      console.warn(`${log} -> NOT INDIA`);
      return false;
    }

    if (isTor) {
      console.warn(`${log} -> TOR EXIT`);
      return false;
    }

    if (isHostingAsn) {
      console.warn(`${log} -> HOSTING ASN`);
      return false;
    }

    console.log(`${log} -> ALLOWED`);
    return true;
  } catch (err) {
    console.error("[geo] Lookup failed:", err);
    return false;
  }
}
