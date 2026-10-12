import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "../../../../services/AuditLog.service";
import { setting } from "../../../../services/Setting.service";
import { requireAdmin } from "../../../../utils/Auth/Auth.requireRole.util";
import { getPool } from "../../../../lib/Database/main.db";
import { createSettingSchema } from "../../../../utils/zod/setting.validator.zod";
import type { SettingRow } from "../../../../types/Setting/setting.types";

/**
 * GET /api/admin/settings
 * List every setting toggle, ordered by field name.
 */
export async function GET() {
  const guard = await requireAdmin({ label: "GET /api/admin/settings" });
  if (!guard.ok) return guard.response;

  try {
    const p = await getPool();
    const [rows] = await p.query<SettingRow[]>(
      `SELECT field_name, active, save_in_redis
         FROM setting_toggle
        ORDER BY field_name ASC`,
    );

    return NextResponse.json({
      settings: rows.map((r) => ({
        field_name: r.field_name,
        active: Boolean(r.active),
        save_in_redis: Boolean(r.save_in_redis),
      })),
    });
  } catch (err) {
    console.error("[settings] GET failed:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/settings
 * Create a new setting toggle.
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin({ label: "POST /api/admin/settings" });
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = createSettingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { field_name, active, save_in_redis } = parsed.data;
    const p = await getPool();

    const [existing] = await p.query<SettingRow[]>(
      `SELECT field_name FROM setting_toggle WHERE field_name = ? LIMIT 1`,
      [field_name],
    );
    if (existing.length > 0) {
      return NextResponse.json(
        { error: `Setting "${field_name}" already exists` },
        { status: 409 },
      );
    }

    const created = await setting.create(p, field_name, active, save_in_redis);

    await auditLog.log(p, {
      userId: guard.session.user.id ?? null,
      action: "CREATE",
      entityType: "SYSTEM",
      entityId: field_name,
      description: `Created setting toggle "${field_name}"`,
      metadata: created,
    });

    return NextResponse.json({ setting: created }, { status: 201 });
  } catch (err) {
    console.error("[settings] POST failed:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
