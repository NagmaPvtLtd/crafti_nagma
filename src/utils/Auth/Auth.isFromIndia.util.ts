const MAXMIND_ACCOUNT_ID = process.env.MAXMIND_ACCOUNT_ID;
const MAXMIND_LICENSE_KEY = process.env.MAXMIND_LICENSE_KEY;

const MAXMIND_BASE = "https://geolite.info/geoip/v2.1";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface MaxMindCityResponse {
  country?: { iso_code?: string };
  registered_country?: { iso_code?: string };
  traits?: {
    autonomous_system_number?: number;
    autonomous_system_organization?: string;
    is_anonymous_proxy?: boolean;
    is_satellite_provider?: boolean;
  };
}

interface IpIntel {
  countryCode: string | null;
  asnNumber: number | null;
  asnOrg: string | null;
  isAnonymousProxy: boolean;
  isSatelliteProvider: boolean;
}

/* -------------------------------------------------------------------------- */
/*  MaxMind lookup                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Calls the MaxMind GeoIP2 City endpoint for a single IP. Returns country
 * code, ASN number, and ASN organization in one round trip.
 *
 * The City endpoint is used instead of Country because City includes the
 * ASN fields we need for the hosting heuristic; Country does not.
 *
 * @returns A parsed `IpIntel` object, or `null` if the request failed.
 */
async function lookupMaxMind(ip: string): Promise<IpIntel | null> {
  if (!MAXMIND_ACCOUNT_ID || !MAXMIND_LICENSE_KEY) {
    console.error(
      "[GEO - CONFIG] ✕ Missing MaxMind credentials (MAXMIND_ACCOUNT_ID, MAXMIND_LICENSE_KEY)",
    );
    return null;
  }

  const auth = Buffer.from(
    `${MAXMIND_ACCOUNT_ID}:${MAXMIND_LICENSE_KEY}`,
  ).toString("base64");

  try {
    const res = await fetch(`${MAXMIND_BASE}/country/${ip}`, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
    });

    /* 404 means the IP is not in the database — not an error, just
       unknown. Treat it as a null result so the caller can deny. */
    if (res.status === 404) {
      console.warn(`[GEO - LOOKUP] ➤ No MaxMind record for ${ip}`);
      return null;
    }

    if (!res.ok) {
      const body = await res.text();
      console.warn(
        `[GEO - LOOKUP] ✕ MaxMind lookup failed — HTTP ${res.status} : ${body}`,
      );
      return null;
    }

    const data = (await res.json()) as MaxMindCityResponse;

    return {
      countryCode: data.country?.iso_code ?? null,
      asnNumber: data.traits?.autonomous_system_number ?? null,
      asnOrg: data.traits?.autonomous_system_organization ?? null,
      isAnonymousProxy: data.traits?.is_anonymous_proxy ?? false,
      isSatelliteProvider: data.traits?.is_satellite_provider ?? false,
    };
  } catch (err) {
    console.error("[GEO - LOOKUP] ✕ MaxMind request threw :", err);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  Tor bulk exit list                                                        */
/* -------------------------------------------------------------------------- */

const TOR_EXIT_LIST_URL = "https://check.torproject.org/torbulkexitlist";
const TOR_REFRESH_MS = 60 * 60 * 1000;

let torExits: Set<string> = new Set();
let torFetchedAt = 0;
let torFetching: Promise<void> | null = null;

/**
 * Refreshes the Tor exit list if the cached copy is older than one hour.
 *
 * Concurrency: multiple callers within the TTL window share the same
 * in-flight promise, so a burst of sign-ins at cold start triggers at
 * most one HTTP request.
 *
 * Failure: a failed fetch leaves the previous set intact. If the list
 * has never been successfully loaded, the set is empty and the Tor layer
 * does not fire.
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

      console.log(
        `[GEO - TOR] >_ Tor exit list loaded (${torExits.size} entries)`,
      );
    } catch (err) {
      console.warn("[GEO - TOR] ✕ Tor exit list refresh failed :", err);
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
 *   1. x-forwarded-for   first public IP in the comma-separated chain
 *   2. x-real-ip         nginx default
 *   3. cf-connecting-ip  Cloudflare
 *   4. x-vercel-ip       Vercel
 *
 * Behind a reverse proxy, x-forwarded-for is a list of hops. The first
 * public entry is the client; entries before it are private-range hops
 * from the same network. In development all entries may be private —
 * the first non-empty entry is returned so the dev-bypass logic can act
 * on it.
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
 * Invoked from the NextAuth `signIn` callback. A `false` return should
 * be translated into a redirect to the login page with an appropriate
 * error code.
 *
 * @param headers  The request headers, obtained via `next/headers`.
 * @returns        `true` if the request is allowed, `false` otherwise.
 */
export default async function isRequestFromIndia(
  headers: Headers,
): Promise<boolean> {
  const ip = getClientIp(headers);

  /* ---- Development bypass ------------------------------------------- */
  if (IS_DEV && (!ip || isLoopback(ip) || isPrivateIp(ip))) {
    console.log(`[GEO - DEV] ➤ Dev bypass (ip=${ip ?? "none"}) — allowed`);
    return true;
  }

  if (!ip) {
    console.warn("[GEO - DENY] ✕ No client IP found");
    return false;
  }

  /* Kick off the Tor list refresh without awaiting it. */
  void loadTorExitList();

  /* ---- MaxMind lookup ---------------------------------------------- */
  const intel = await lookupMaxMind(ip);

  if (!intel) {
    console.warn(`[GEO - DENY] ✕ Lookup failed for ${ip}`);
    return false;
  }

  /* ---- Tor exit ---------------------------------------------------- */
  const isTor = torExits.has(ip);

  /* ---- Hosting ASN heuristic --------------------------------------- */
  const orgLower = (intel.asnOrg ?? "").toLowerCase();
  const isHostingAsn = HOSTING_KEYWORDS.some((kw) => orgLower.includes(kw));

  const ctx =
    `${ip} | country=${intel.countryCode} | tor=${isTor} | ` +
    `hostingAsn=${isHostingAsn} | anonProxy=${intel.isAnonymousProxy} | ` +
    `asnOrg=${intel.asnOrg}`;

  /* ---- Gates ------------------------------------------------------- */
  if (intel.countryCode !== "IN") {
    console.warn(`[GEO - DENY] ✕ Not India — ${ctx}`);
    return false;
  }

  if (intel.isAnonymousProxy) {
    console.warn(`[GEO - DENY] ✕ Anonymous proxy — ${ctx}`);
    return false;
  }

  if (isTor) {
    console.warn(`[GEO - DENY] ✕ Tor exit — ${ctx}`);
    return false;
  }

  if (isHostingAsn) {
    console.warn(`[GEO - DENY] ✕ Hosting ASN — ${ctx}`);
    return false;
  }

  console.log(`[GEO - ALLOW] >_ ${ctx}`);
  return true;
}
