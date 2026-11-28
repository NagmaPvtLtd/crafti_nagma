import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";

import { getPool } from "../../../../lib/Database/main.db";
import { requireAdmin } from "../../../../utils/Auth/Auth.requireRole.util";
import {
  USER_ROLES,
  USER_STATUSES,
} from "../../../../utils/zod/admin/userManager.zod";
import type {
  UserRole,
  UserStatus,
} from "../../../../types/User/UserRow.types";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

/**
 * Display name for a `users` row, matching the audit-log convention.
 *
 * @constant USER_NAME_EXPR
 * @description Prefers `full_name`, then joins `first_name` and `last_name`, then
 *              falls back to the email local part so a row always has a label.
 */
const USER_NAME_EXPR =
  "COALESCE(u.full_name, CONCAT_WS(' ', u.first_name, u.last_name), u.email)";

interface UserListRow extends RowDataPacket {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  email_verified: 0 | 1;
  profile_completed: 0 | 1;
  image: string | null;
  password_hash: string | null;
  created_at: string;
}

interface CountRow extends RowDataPacket {
  total: number;
}

interface FacetRow extends RowDataPacket {
  value: string;
  count: number;
}

/**
 * Parses a positive integer query parameter.
 *
 * @function toPositiveInt
 * @description Returns `fallback` when the value is missing, not finite or below 1.
 *
 * @param {string | null} value - Raw query-string value
 * @param {number} fallback - Value used when parsing fails
 *
 * @returns {number} Positive integer or the fallback
 */
function toPositiveInt(value: string | null, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/**
 * Whether a raw query value is one of the accepted role or status values.
 *
 * @function isMember
 * @description Narrows a raw string against a readonly tuple of allowed values.
 *
 * @param {readonly string[]} allowed - Accepted values
 * @param {string} value - Raw query-string value
 *
 * @returns {boolean} True when `value` is in `allowed`
 */
function isMember(allowed: readonly string[], value: string): boolean {
  return allowed.includes(value);
}

/**
 * Lists registered users with search, role and status filters plus pagination.
 *
 * @async
 * @function GET
 * @description Reads the `users` table behind the admin guard, so admins and super
 *              admins reach it. A free-text search matches the display name, email and
 *              phone. `role` and `status` accept only the enum values declared in
 *              `users`; anything else is ignored rather than rejected. Every response
 *              also carries role and status facet counts for the filter dropdowns.
 *
 * @param {NextRequest} req - The incoming HTTP request
 * @query {string} [search] - Free text matched against display name, email and phone
 * @query {string} [role] - Exact `users.role` filter (`super_admin`, `admin`, `manager`, `customer`)
 * @query {string} [status] - Exact `users.status` filter (`active`, `inactive`, `banned`)
 * @query {number} [page] - Page number (default: 1)
 * @query {number} [limit] - Page size (default: 25, max: 100)
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - generatedAt: ISO timestamp of the response
 *   - scope: `admin` or `super_admin` (the caller's role)
 *   - selfId: the caller's user id, so the UI can lock their own row
 *   - query: the effective `search`, `role`, `status`, `page` and `limit`
 *   - pagination: `page`, `limit`, `total` and `totalPages`
 *   - users: rows with `id`, `name`, `email`, `phone`, `role`, `status`, `emailVerified`,
 *            `profileCompleted`, `image`, `hasPassword` and `createdAt`, sorted A-Z by name
 *   - facets: `roles` and `statuses`, each with a `value` and `count`
 *
 * @throws {401} Unauthorized - No session
 * @throws {403} Forbidden - Account not active, no role, or role below admin
 * @throws {500} Database failure while counting or reading `users`
 *
 * @description Workflow:
 *   1. Initialize the admin guard (session, active status, role rank)
 *   2. Parse `search`, `role`, `status`, `page` and `limit` (clamped to 1-100)
 *   3. Ignore a `role` or `status` value outside the enum tuples
 *   4. Compute `offset` from page and limit
 *   5. Initialize the database pool
 *   6. Build the `WHERE` list from the trimmed search and the exact filters
 *   7. Count matching rows with the same conditions
 *   8. Select the page slice A-Z by display name, mapping auth and profile fields
 *   9. Load role and status facet counts over the whole table
 *   10. Return 200 response with scope, query, pagination, users and facets
 */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin({ label: "GET /api/admin/users" });
  if (!guard.ok) return guard.response;

  const actorRole = (guard.session.user.role ?? "admin") as UserRole;
  const selfId = guard.session.user.id ?? null;

  const url = new URL(req.url);
  const search = (url.searchParams.get("search") ?? "").trim();
  const roleRaw = (url.searchParams.get("role") ?? "").trim();
  const statusRaw = (url.searchParams.get("status") ?? "").trim();
  const page = Math.max(1, toPositiveInt(url.searchParams.get("page"), 1));
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, toPositiveInt(url.searchParams.get("limit"), DEFAULT_LIMIT)),
  );
  const offset = (page - 1) * limit;

  const role = isMember(USER_ROLES, roleRaw) ? (roleRaw as UserRole) : null;
  const status = isMember(USER_STATUSES, statusRaw)
    ? (statusRaw as UserStatus)
    : null;

  const where: string[] = [];
  const params: unknown[] = [];

  if (search) {
    const like = `%${search}%`;
    where.push(
      `(${USER_NAME_EXPR} LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`,
    );
    params.push(like, like, like);
  }
  if (role) {
    where.push("u.role = ?");
    params.push(role);
  }
  if (status) {
    where.push("u.status = ?");
    params.push(status);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  try {
    const p = await getPool();

    const [countRows] = await p.query<CountRow[]>(
      `SELECT COUNT(*) AS total FROM users u ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total ?? 0);

    const [rows] = await p.query<UserListRow[]>(
      `SELECT
         u.id,
         ${USER_NAME_EXPR} AS name,
         u.email,
         u.phone,
         u.role,
         u.status,
         u.email_verified,
         u.profile_completed,
         u.google_profile_picture AS image,
         u.password_hash,
         u.created_at
       FROM users u
       ${whereSql}
       ORDER BY ${USER_NAME_EXPR} ASC, u.id ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    const [roleFacets] = await p.query<FacetRow[]>(
      `SELECT role AS value, COUNT(*) AS count FROM users GROUP BY role`,
    );
    const [statusFacets] = await p.query<FacetRow[]>(
      `SELECT status AS value, COUNT(*) AS count FROM users GROUP BY status`,
    );

    return NextResponse.json(
      {
        ok: true,
        generatedAt: new Date().toISOString(),
        scope: actorRole,
        selfId,
        query: { search, role, status, page, limit },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
        users: rows.map((row) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          phone: row.phone,
          role: row.role,
          status: row.status,
          emailVerified: Boolean(row.email_verified),
          profileCompleted: Boolean(row.profile_completed),
          image: row.image,
          hasPassword: row.password_hash !== null,
          createdAt: row.created_at,
        })),
        facets: {
          roles: roleFacets.map((row) => ({
            value: row.value,
            count: Number(row.count),
          })),
          statuses: statusFacets.map((row) => ({
            value: row.value,
            count: Number(row.count),
          })),
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[GET /api/admin/users] failed:", err);
    return NextResponse.json(
      { error: "Could not load users" },
      { status: 500 },
    );
  }
}
