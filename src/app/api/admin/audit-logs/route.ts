// app/api/admin/audit-logs/route.ts
import { NextRequest, NextResponse } from "next/server";

import { getPool } from "../../../../lib/Database/main.db";
import { requireAdmin } from "../../../../utils/Auth/Auth.requireRole.util";

type DbPool = Awaited<ReturnType<typeof getPool>>;

export type RangeType = "30d" | "90d" | "365d" | "lifetime";

const ALLOWED_RANGES = ["30d", "90d", "365d", "lifetime"] as const;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

/** Audit log id is CHAR(40). Alnum + underscore + hyphen to be safe. */
const ID_PATTERN = /^[A-Za-z0-9_-]{40}$/;

/**
 * `users` table has no `name` column — it has first_name, last_name,
 * full_name. This expression picks the best available display name.
 *
 *   full_name  →  "Prince Kumar"
 *   first+last →  "Prince Kumar"
 *   fallback   →  NULL
 */
const USER_NAME_EXPR =
  "COALESCE(u.full_name, CONCAT_WS(' ', u.first_name, u.last_name))";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function parseRange(v: string | null): RangeType {
  return v && (ALLOWED_RANGES as readonly string[]).includes(v)
    ? (v as RangeType)
    : "30d";
}

function rangeStart(range: RangeType): Date | null {
  const now = new Date();
  switch (range) {
    case "30d":
      return new Date(now.getTime() - 30 * 86_400_000);
    case "90d":
      return new Date(now.getTime() - 90 * 86_400_000);
    case "365d":
      return new Date(now.getTime() - 365 * 86_400_000);
    case "lifetime":
      return null;
  }
}

function parseIntSafe(v: string | null, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/**
 * MySQL JSON columns are usually parsed by the driver. Fall back to
 * a manual parse if we got a string. Non-JSON → null.
 */
function parseMetadata(v: unknown): Record<string, unknown> | null {
  if (v == null) return null;
  if (typeof v === "object") return v as Record<string, unknown>;
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  GET /api/admin/audit-logs                                          */
/* ------------------------------------------------------------------ */

export async function GET(req: NextRequest) {
  const guard = await requireAdmin({ label: "GET /api/admin/audit-logs" });
  if (!guard.ok) return guard.response;

  const role = guard.session.user.role as string;
  const isSuperAdmin = role === "super_admin";

  const url = new URL(req.url);

  const requestedRange = parseRange(url.searchParams.get("range"));
  // Admin is locked to the last 30 days regardless of what was asked.
  const range: RangeType = isSuperAdmin ? requestedRange : "30d";

  const searchRaw = (url.searchParams.get("search") ?? "").trim();
  const action = url.searchParams.get("action")?.trim() || null;
  const entityType = url.searchParams.get("entity_type")?.trim() || null;
  const page = Math.max(1, parseIntSafe(url.searchParams.get("page"), 1));
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseIntSafe(url.searchParams.get("limit"), DEFAULT_LIMIT)),
  );
  const offset = (page - 1) * limit;

  // A 40-char alnum id → exact lookup, bypasses the date window.
  const isIdLookup = ID_PATTERN.test(searchRaw);

  try {
    const p = await getPool();

    const where: string[] = [];
    const params: unknown[] = [];

    if (isIdLookup) {
      // Exact id lookup: ignore range entirely, even for admin.
      where.push(`al.id = ?`);
      params.push(searchRaw);
    } else {
      const start = rangeStart(range);
      if (start) {
        where.push(`al.created_at >= ?`);
        params.push(start);
      }

      if (searchRaw) {
        const like = `%${searchRaw}%`;
        // NOTE: users has no `name` — use full_name + first/last.
        where.push(
          `(
            al.description LIKE ?
            OR al.action LIKE ?
            OR al.entity_type LIKE ?
            OR al.entity_id LIKE ?
            OR al.user_id LIKE ?
            OR u.email LIKE ?
            OR u.full_name LIKE ?
            OR u.first_name LIKE ?
            OR u.last_name LIKE ?
          )`,
        );
        params.push(
          like, // al.description
          like, // al.action
          like, // al.entity_type
          like, // al.entity_id
          like, // al.user_id
          like, // u.email
          like, // u.full_name
          like, // u.first_name
          like, // u.last_name
        );
      }
    }

    if (action) {
      where.push(`al.action = ?`);
      params.push(action);
    }
    if (entityType) {
      where.push(`al.entity_type = ?`);
      params.push(entityType);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    /* ---------- total count ---------- */
    const [countRows] = await p.query<any[]>(
      `SELECT COUNT(*) AS total
         FROM audit_logs al
         LEFT JOIN users u ON al.user_id = u.id
         ${whereClause}`,
      params,
    );
    const total = Number(countRows[0]?.total) || 0;

    /* ---------- page slice ---------- */
    const [rows] = await p.query<any[]>(
      `SELECT al.id,
              al.user_id,
              al.action,
              al.entity_type,
              al.entity_id,
              al.description,
              al.metadata,
              al.created_at,
              u.email                    AS user_email,
              ${USER_NAME_EXPR}          AS user_name
         FROM audit_logs al
         LEFT JOIN users u ON al.user_id = u.id
         ${whereClause}
         ORDER BY al.created_at DESC
         LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    const logs = rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userEmail: r.user_email,
      userName: r.user_name,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      description: r.description,
      metadata: parseMetadata(r.metadata),
      createdAt: r.created_at,
    }));

    /* ---------- facets (for filter dropdowns) ---------- */
    const [actionFacetRows] = await p.query<any[]>(
      `SELECT action, COUNT(*) AS count
         FROM audit_logs
        GROUP BY action
        ORDER BY count DESC`,
    );
    const [entityFacetRows] = await p.query<any[]>(
      `SELECT entity_type, COUNT(*) AS count
         FROM audit_logs
        GROUP BY entity_type
        ORDER BY count DESC`,
    );

    return NextResponse.json({
      scope: isSuperAdmin ? ("super_admin" as const) : ("admin" as const),
      generatedAt: new Date().toISOString(),
      range,
      requestedRange,
      bypassedRange: isIdLookup && !isSuperAdmin,
      query: {
        search: searchRaw || null,
        action,
        entityType,
        page,
        limit,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      logs,
      facets: {
        actions: actionFacetRows.map((r) => ({
          action: r.action,
          count: Number(r.count),
        })),
        entityTypes: entityFacetRows.map((r) => ({
          entityType: r.entity_type,
          count: Number(r.count),
        })),
      },
    });
  } catch (err) {
    console.error("[audit-logs] GET failed:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
