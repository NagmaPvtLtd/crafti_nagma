import { NextRequest, NextResponse } from "next/server";

import { auditLog } from "../../../../../services/AuditLog.service";
import { setting } from "../../../../../services/Setting.service";
import { requireAdmin } from "../../../../../utils/Auth/Auth.requireRole.util";
import { getPool } from "../../../../../lib/Database/main.db";
import { updateSettingSchema } from "../../../../../utils/zod/setting.validator.zod";
import type { SettingRow } from "../../../../../types/Setting/setting.types";

/**
 * PUT /api/admin/settings/[fieldName]
 * Update a toggle, optionally rename it.
 */
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ fieldName: string }> },
) {
  const guard = await requireAdmin({
    label: "PUT /api/admin/settings/[fieldName]",
  });
  if (!guard.ok) return guard.response;

  try {
    const { fieldName } = await ctx.params;
    const original = decodeURIComponent(fieldName);

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = updateSettingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { new_field_name, active, save_in_redis } = parsed.data;
    const p = await getPool();

    const [beforeRows] = await p.query<SettingRow[]>(
      `SELECT field_name, active, save_in_redis
         FROM setting_toggle
        WHERE field_name = ? LIMIT 1`,
      [original],
    );
    if (beforeRows.length === 0) {
      return NextResponse.json({ error: "Setting not found" }, { status: 404 });
    }
    const before = beforeRows[0];

    if (new_field_name && new_field_name !== original) {
      const [clash] = await p.query<SettingRow[]>(
        `SELECT field_name FROM setting_toggle WHERE field_name = ? LIMIT 1`,
        [new_field_name],
      );
      if (clash.length > 0) {
        return NextResponse.json(
          { error: `Setting "${new_field_name}" already exists` },
          { status: 409 },
        );
      }
    }

    const after = await setting.update(p, original, {
      new_field_name,
      active,
      save_in_redis,
    });
    if (!after) {
      return NextResponse.json({ error: "Setting not found" }, { status: 404 });
    }

    await auditLog.log(p, {
      userId: guard.session.user.id ?? null,
      action: "UPDATE",
      entityType: "SYSTEM",
      entityId: after.field_name,
      description:
        after.field_name !== original
          ? `Renamed setting toggle "${original}" → "${after.field_name}"`
          : `Updated setting toggle "${original}"`,
      metadata: {
        before: {
          field_name: before.field_name,
          active: Boolean(before.active),
          save_in_redis: Boolean(before.save_in_redis),
        },
        after,
      },
    });

    return NextResponse.json({ setting: after });
  } catch (err) {
    console.error("[settings] PUT failed:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/settings/[fieldName]
 * Permanently delete a toggle.
 */
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ fieldName: string }> },
) {
  const guard = await requireAdmin({
    label: "DELETE /api/admin/settings/[fieldName]",
  });
  if (!guard.ok) return guard.response;

  try {
    const { fieldName } = await ctx.params;
    const name = decodeURIComponent(fieldName);
    const p = await getPool();

    const [rows] = await p.query<SettingRow[]>(
      `SELECT field_name, active, save_in_redis
         FROM setting_toggle
        WHERE field_name = ? LIMIT 1`,
      [name],
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "Setting not found" }, { status: 404 });
    }
    const before = rows[0];

    const removed = await setting.remove(p, name);
    if (!removed) {
      return NextResponse.json({ error: "Setting not found" }, { status: 404 });
    }

    await auditLog.log(p, {
      userId: guard.session.user.id ?? null,
      action: "DELETE",
      entityType: "SYSTEM",
      entityId: name,
      description: `Deleted setting toggle "${name}"`,
      metadata: {
        before: {
          field_name: before.field_name,
          active: Boolean(before.active),
          save_in_redis: Boolean(before.save_in_redis),
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[settings] DELETE failed:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
