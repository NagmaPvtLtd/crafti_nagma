/**
 * ═════════════════════════════════════════════════════════════════════
 *  requireRole — centralised auth guard for API routes
 * ═════════════════════════════════════════════════════════════════════
 *
 * ROLES (ranked, higher wins)
 * ───────────────────────────
 *   super_admin (40)  >  admin (30)  >  manager (20)  >  customer (10)
 *
 * USAGE
 * ─────
 *   const guard = await requireRole(["admin"]);
 *   if (!guard.ok) return guard.response;
 *   const { id, role } = guard.session.user;   // typed + trusted
 *
 *   // Shorthand wrappers (same options object):
 *   requireSuperAdmin()   →  rank >= super_admin
 *   requireAdmin()        →  rank >= admin
 *   requireManager()      →  rank >= manager
 *   requireAuth()         →  any active logged-in user
 *
 * OPTIONS
 * ───────
 *   label             string   Override the auto-derived route label
 *                              (only needed when you want something
 *                              different from the file path).
 *
 *   allowHigherRoles  boolean  Default true. Set false to require an
 *                              EXACT role match (no hierarchy).
 *
 * DECISION FLOW (in order)
 * ────────────────────────
 *   1. allowed[] is empty                          → 500
 *   2. getServerSession() throws                   → 500
 *   3. No session                                  → 401
 *   4. session.user.status !== "active"            → 403
 *   5. session.user.role is missing                → 403
 *   6. Role rank < min required rank               → 403
 *   7. Success                                     → { ok: true, session }
 *
 * LOGS
 * ────
 *   Every line is prefixed with [AUTH] for easy filtering.
 *   The route label is auto-derived from the caller's file path
 *   (e.g. "app/api/admin/settings/route.ts") unless you pass
 *   `label` explicitly.
 *
 * ═════════════════════════════════════════════════════════════════════
 */

import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { UserRole } from "@/types/User/UserRow.types";

/* ------------------------------------------------------------------ */
/*  Role hierarchy                                                     */
/* ------------------------------------------------------------------ */

const ROLE_RANK: Record<UserRole, number> = {
  super_admin: 40,
  admin: 30,
  manager: 20,
  customer: 10,
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type GuardOk = { ok: true; session: Session };
type GuardFail = { ok: false; response: NextResponse };
export type GuardResult = GuardOk | GuardFail;

export interface GuardOptions {
  label?: string;
  allowHigherRoles?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Internal utilities                                                 */
/* ------------------------------------------------------------------ */

/**
 * Walks the stack trace and returns something like:
 *   "app/api/admin/settings/route.ts"
 *
 * Falls back to "unknown-route" only if the path can't be parsed —
 * which shouldn't happen inside a normal Next.js Route Handler.
 */
function deriveRouteLabel(): string {
  const stack = new Error().stack;
  if (!stack) return "unknown-route";

  const lines = stack.split("\n");

  for (const line of lines) {
    // Skip frames inside this guard file itself.
    if (line.includes("requireRole.util")) continue;

    // Match "app/..." or "src/app/..." up to a source extension.
    const match = line.match(
      /[/\\](?:src[/\\])?(app[/\\][^:)]+?\.(?:ts|tsx|js|jsx))/,
    );
    if (match?.[1]) return match[1].replace(/\\/g, "/");
  }

  return "unknown-route";
}

/* ------------------------------------------------------------------ */
/*  Guard                                                              */
/* ------------------------------------------------------------------ */

export async function requireRole(
  allowed: UserRole[],
  options: GuardOptions = {},
): Promise<GuardResult> {
  const { label = deriveRouteLabel(), allowHigherRoles = true } = options;

  /* ---- 0. sanity check the caller -------------------------------- */
  if (!Array.isArray(allowed) || allowed.length === 0) {
    console.error(
      `[AUTH - CONFIG] ✕ ${label} — requireRole called with empty role list`,
    );
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 },
      ),
    };
  }

  console.log(`[AUTH - CHECKING] ➤ ${label} — required: ${allowed.join(", ")}`);

  /* ---- 1. read the session -------------------------------------- */
  let session: Session | null = null;
  try {
    session = await getServerSession(authOptions);
  } catch (err) {
    console.error(`[AUTH - FAILED] ✕ ${label} — getServerSession threw :`, err);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Auth service unavailable" },
        { status: 500 },
      ),
    };
  }

  /* ---- 2. no session → 401 -------------------------------------- */
  if (!session?.user) {
    console.warn(`[AUTH - DENY] ✕ ${label} — no session`);
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { id, email, role, status } = session.user;
  const who = `id=${id} email=${email} role=${role} status=${status}`;

  /* ---- 3. inactive / banned → 403 ------------------------------- */
  if (status !== "active") {
    console.warn(`[AUTH - DENY] ✕ ${label} — account not active | ${who}`);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Account is not active" },
        { status: 403 },
      ),
    };
  }

  /* ---- 4. no role assigned → 403 -------------------------------- */
  if (!role) {
    console.warn(`[AUTH - DENY] ✕ ${label} — user has no role | ${who}`);
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  /* ---- 5. role check -------------------------------------------- */
  const allowedSet = new Set<UserRole>(allowed);

  let passes: boolean;
  if (allowHigherRoles) {
    const minRank = Math.min(...allowed.map((r) => ROLE_RANK[r] ?? 0));
    const userRank = ROLE_RANK[role] ?? 0;
    passes = userRank >= minRank;
  } else {
    passes = allowedSet.has(role);
  }

  if (!passes) {
    console.warn(
      `[AUTH - DENY] ✕ ${label} — insufficient role | ${who} | required=${allowed.join(", ")} allowHigherRoles=${allowHigherRoles}`,
    );
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  /* ---- 6. granted ----------------------------------------------- */
  console.log(`[AUTH - ALLOW] >_ ${label} — access granted | ${who}`);

  return { ok: true, session };
}

/* ------------------------------------------------------------------ */
/*  Convenience wrappers                                               */
/* ------------------------------------------------------------------ */

export const requireSuperAdmin = (opts?: GuardOptions) =>
  requireRole(["super_admin"], opts);

export const requireAdmin = (opts?: GuardOptions) =>
  requireRole(["admin"], opts);

export const requireManager = (opts?: GuardOptions) =>
  requireRole(["manager"], opts);

export const requireAuth = (opts?: GuardOptions) =>
  requireRole(["customer"], opts);
