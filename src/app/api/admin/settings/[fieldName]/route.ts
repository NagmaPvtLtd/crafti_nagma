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
/**
 * Updates a setting toggle and can rename it.
 *
 * @async
 * @function PUT
 * @description Decodes the `fieldName` segment, validates the body with
 *              `updateSettingSchema` (at least one of `new_field_name`, `active` or
 *              `save_in_redis` is required; the new name follows the same
 *              `^[a-z][a-z0-9_:]{2,99}$` rule), refuses a rename that clashes with another
 *              toggle, then writes through `setting.update`, which reconciles the Redis map
 *              (drops the old key on rename, merges or removes the new one). The before/after
 *              snapshot is audited.
 *
 * @param {NextRequest} req - The incoming HTTP request with a JSON body
 * @param {Object} context - Next.js route context
 * @param {Promise<{ fieldName: string }>} context.params - Route parameters
 *                                                        (`(await context.params).fieldName`)
 *
 * @body {string} [new_field_name] - New toggle name (trimmed, lowercased, 3-100 chars)
 * @body {boolean} [active] - New state
 * @body {boolean} [save_in_redis] - Whether the toggle should live in Redis
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - setting: the updated `{ field_name, active, save_in_redis }`
 *
 * @throws {400} Invalid JSON, or the body fails `updateSettingSchema`
 * @throws {401} Unauthorized - No session
 * @throws {403} Forbidden - Account not active, no role, or role below admin
 * @throws {404} The setting named in the URL does not exist
 * @throws {409} `new_field_name` is already used by another toggle
 * @throws {500} Database failure while reading or updating `setting_toggle`
 *
 * @description Workflow:
 *   1. Initialize the admin guard (session, active status, role rank)
 *   2. Await `context.params` and decode the `fieldName` segment
 *   3. Parse the JSON body, returning 400 when it is not valid JSON
 *   4. Validate with `updateSettingSchema`, returning field errors on failure
 *   5. Initialize the database pool
 *   6. Load the current row and return 404 when it is missing
 *   7. When renaming, check that the new name is not taken and return 409 on a clash
 *   8. Apply the patch through `setting.update` and return 404 if no row was updated
 *   9. Write an UPDATE / SYSTEM audit entry with the before and after snapshots
 *   10. Return 200 response with the updated setting
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
/**
 * Permanently deletes a setting toggle.
 *
 * @async
 * @function DELETE
 * @description Decodes the `fieldName` segment, confirms the row exists, deletes it through
 *              `setting.remove` (which also drops it from the Redis settings map) and records
 *              the removed value in the audit log. No cascade is performed.
 *
 * @param {NextRequest} _req - The incoming HTTP request (unused)
 * @param {Object} context - Next.js route context
 * @param {Promise<{ fieldName: string }>} context.params - Route parameters
 *                                                        (`(await context.params).fieldName`)
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true` once the toggle is gone
 *
 * @throws {401} Unauthorized - No session
 * @throws {403} Forbidden - Account not active, no role, or role below admin
 * @throws {404} The setting named in the URL does not exist
 * @throws {500} Database failure while reading or deleting `setting_toggle`
 *
 * @description Workflow:
 *   1. Initialize the admin guard (session, active status, role rank)
 *   2. Await `context.params` and decode the `fieldName` segment
 *   3. Initialize the database pool
 *   4. Load the row and return 404 when it is missing
 *   5. Delete through `setting.remove` and return 404 when nothing was deleted
 *   6. Write a DELETE / SYSTEM audit entry with the removed values
 *   7. Return 200 response with `{ ok: true }`
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
