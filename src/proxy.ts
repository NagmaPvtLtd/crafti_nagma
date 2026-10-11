import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { MyJWT } from "./types/User/JWT.types";
import { rateLimitMiddleware } from "./lib/Redis/rateLimiter.redis";
import { UserRole } from "./types/User/UserRow.types";

/* =============================================================================
 * PROXY / MIDDLEWARE — REFERENCE
 * =============================================================================
 *
 * ROLE HIERARCHY (low → high):
 *   customer < manager < admin < super_admin
 *   hasRole(user, "admin") is true for admin AND super_admin.
 *
 * API GROUPS (mirror of app/api/* folder layout):
 *   /api/auth          public       NextAuth
 *   /api/public        public       products, webhooks
 *   /api/user          customer+    cart, orders, profile
 *   /api/manager       manager+     products, categories, orders
 *   /api/admin         admin+       users, payments, audit logs
 *   /api/admin-super   super_admin  settings, roles
 *
 * PAGE GROUPS:
 *   /admin/*       staff (manager and above)
 *   /dashboard/*   any authenticated user
 *   everything else  public — works for logged-in and logged-out visitors
 *
 * AUTH STATE:
 *   Banned / inactive users are treated as logged out on every request.
 *
 * RATE LIMITING:
 *   Applied to every /api/* route except /api/auth.
 * ========================================================================== */

const ROLE_WEIGHT: Record<UserRole, number> = {
  customer: 0,
  manager: 1,
  admin: 2,
  super_admin: 3,
};

function hasRole(user: MyJWT | null, minRole: UserRole): boolean {
  if (!user?.role) return false;
  const userWeight = ROLE_WEIGHT[user.role as UserRole] ?? -1;
  return userWeight >= ROLE_WEIGHT[minRole];
}

const API_AUTH = "/api/auth";
const API_PUBLIC = "/api/public";
const API_USER = "/api/user";
const API_MANAGER = "/api/manager";
const API_ADMIN = "/api/admin";
const API_ADMIN_SUPER = "/api/admin-super";

const PAGES_ADMIN = "/admin";
const PAGES_DASHBOARD = "/dashboard";

const RATE_LIMIT_EXCLUDED_PREFIXES = [API_AUTH] as const;

interface RateLimitRule {
  prefix: string;
  maxRequests: number;
  windowMs: number;
  blockTimeMs: number;
}

const RATE_LIMIT_RULES: readonly RateLimitRule[] = [
  {
    prefix: API_PUBLIC,
    maxRequests: 60,
    windowMs: 60_000,
    blockTimeMs: 60_000,
  },
  {
    prefix: API_USER,
    maxRequests: 250,
    windowMs: 60_000,
    blockTimeMs: 5 * 60_000,
  },
  {
    prefix: API_MANAGER,
    maxRequests: 150,
    windowMs: 60_000,
    blockTimeMs: 5 * 60_000,
  },
  {
    prefix: API_ADMIN,
    maxRequests: 100,
    windowMs: 60_000,
    blockTimeMs: 5 * 60_000,
  },
  {
    prefix: API_ADMIN_SUPER,
    maxRequests: 60,
    windowMs: 60_000,
    blockTimeMs: 5 * 60_000,
  },
];

type ApiGroup =
  | "auth"
  | "public"
  | "user"
  | "manager"
  | "admin"
  | "admin-super"
  | "unknown";

function isApi(path: string): boolean {
  return path.startsWith("/api/");
}

function matchesPrefix(path: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(p + "/"));
}

function apiGroup(path: string): ApiGroup {
  if (matchesPrefix(path, [API_AUTH])) return "auth";
  if (matchesPrefix(path, [API_PUBLIC])) return "public";
  if (matchesPrefix(path, [API_USER])) return "user";
  if (matchesPrefix(path, [API_MANAGER])) return "manager";
  if (matchesPrefix(path, [API_ADMIN_SUPER])) return "admin-super";
  if (matchesPrefix(path, [API_ADMIN])) return "admin";
  return "unknown";
}

function shouldRateLimit(path: string): boolean {
  if (!isApi(path)) return false;
  return !matchesPrefix(path, RATE_LIMIT_EXCLUDED_PREFIXES);
}

function rateLimitOverrideFor(path: string): RateLimitRule | undefined {
  return RATE_LIMIT_RULES.find((r) => matchesPrefix(path, [r.prefix]));
}

function respondUnauthorized(req: NextRequest, path: string): NextResponse {
  if (isApi(path)) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set(
    "callbackUrl",
    req.nextUrl.pathname + req.nextUrl.search,
  );
  return NextResponse.redirect(url);
}

function respondForbidden(req: NextRequest, path: string): NextResponse {
  if (isApi(path)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/";
  return NextResponse.redirect(url);
}

function handleApi(
  req: NextRequest,
  path: string,
  user: MyJWT | null,
): NextResponse {
  const group = apiGroup(path);

  switch (group) {
    case "auth":
    case "public":
      return NextResponse.next();

    case "user":
      if (!user) return respondUnauthorized(req, path);
      return NextResponse.next();

    case "manager":
      if (!user) return respondUnauthorized(req, path);
      if (!hasRole(user, "manager")) {
        console.warn(`Manager API denied → ${user.email} → ${path}`);
        return respondForbidden(req, path);
      }
      return NextResponse.next();

    case "admin":
      if (!user) return respondUnauthorized(req, path);
      if (!hasRole(user, "admin")) {
        console.warn(`Admin API denied → ${user.email} → ${path}`);
        return respondForbidden(req, path);
      }
      return NextResponse.next();

    case "admin-super":
      if (!user) return respondUnauthorized(req, path);
      if (!hasRole(user, "super_admin")) {
        console.warn(`Super-admin API denied → ${user.email} → ${path}`);
        return respondForbidden(req, path);
      }
      return NextResponse.next();

    case "unknown":
    default:
      console.warn(`Unknown API route hit: ${path}`);
      return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

function handlePage(
  req: NextRequest,
  path: string,
  user: MyJWT | null,
): NextResponse {
  if (matchesPrefix(path, [PAGES_ADMIN])) {
    if (!user) return respondUnauthorized(req, path);
    if (!hasRole(user, "manager")) {
      console.warn(`Admin page denied → ${user.email} → ${path}`);
      return respondForbidden(req, path);
    }
    return NextResponse.next();
  }

  if (matchesPrefix(path, [PAGES_DASHBOARD])) {
    if (!user) return respondUnauthorized(req, path);
    return NextResponse.next();
  }

  return NextResponse.next();
}

function homePageFor(user: MyJWT): string {
  switch (user.role) {
    case "super_admin":
    case "admin":
    case "manager":
      return "/admin";
    default:
      return "/dashboard";
  }
}

export async function proxy(req: NextRequest): Promise<NextResponse> {
  const path = req.nextUrl.pathname;

  if (shouldRateLimit(path)) {
    const rl = await rateLimitMiddleware(req, rateLimitOverrideFor(path));
    if (rl) {
      return new NextResponse(rl.body, {
        status: rl.status,
        headers: rl.headers,
      });
    }
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  });
  const rawUser = (token as MyJWT) ?? null;
  const user = rawUser && rawUser.status === "active" ? rawUser : null;

  if (path === "/login") {
    if (!user) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = homePageFor(user);
    return NextResponse.redirect(url);
  }

  if (isApi(path)) {
    return handleApi(req, path, user);
  }

  return handlePage(req, path, user);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2|ttf|eot|txt|xml)$).*)",
  ],
};
