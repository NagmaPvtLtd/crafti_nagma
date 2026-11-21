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
/**
 * Lists every setting toggle, ordered by field name.
 *
 * @async
 * @function GET
 * @description Reads `setting_toggle` straight from MySQL (no Redis read) behind the admin
 *              guard and normalizes `active` and `save_in_redis` to booleans.
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - settings: array of `{ field_name, active, save_in_redis }`
 *
 * @throws {401} Unauthorized - No session
 * @throws {403} Forbidden - Account not active, no role, or role below admin
 * @throws {500} Database failure while reading `setting_toggle`
 *
 * @description Workflow:
 *   1. Initialize the admin guard (session, active status, role rank)
 *   2. Initialize the database pool
 *   3. Select `field_name`, `active`, `save_in_redis` ordered by `field_name` ascending
 *   4. Normalize both flags to booleans
 *   5. Return 200 response with the settings list
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
/**
 * Creates a new setting toggle.
 *
 * @async
 * @function POST
 * @description Validates the body with `createSettingSchema`, which trims and lowercases the
 *              name and requires 3-100 characters matching `^[a-z][a-z0-9_:]{2,99}$`.
 *              A duplicate name is refused with 409 before writing. The insert goes through
 *              `setting.create`, which also merges the row into the Redis settings map when
 *              `save_in_redis` is true, and the write is audited with `auditLog.log`.
 *
 * @param {NextRequest} req - The incoming HTTP request with a JSON body
 * @body {string} field_name - Toggle name (trimmed, lowercased, 3-100 chars of a-z, 0-9, `_`
 *                             or `:`, starting with a letter; namespaced like
 *                             `backend:nobody_can_login`)
 * @body {boolean} [active] - Initial state (optional, default: `true`)
 * @body {boolean} [save_in_redis] - Cache this toggle in Redis (optional, default: `true`)
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - setting: the created `{ field_name, active, save_in_redis }`
 *
 * @throws {400} Invalid JSON, or the body fails `createSettingSchema`
 * @throws {401} Unauthorized - No session
 * @throws {403} Forbidden - Account not active, no role, or role below admin
 * @throws {409} A toggle with that `field_name` already exists
 * @throws {500} Database failure while reading or inserting `setting_toggle`
 *
 * @description Workflow:
 *   1. Initialize the admin guard (session, active status, role rank)
 *   2. Parse the JSON body, returning 400 when it is not valid JSON
 *   3. Validate with `createSettingSchema`, returning field errors on failure
 *   4. Initialize the database pool
 *   5. Look for an existing row with the same `field_name` and return 409 when found
 *   6. Insert the toggle through `setting.create` (merges the Redis map when cacheable)
 *   7. Write a CREATE / SYSTEM audit log entry for the new toggle
 *   8. Return 201 response with the created setting
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
