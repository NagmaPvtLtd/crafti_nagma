import { NextRequest, NextResponse } from "next/server";
import { invalidInput, isDuplicateEntry } from "../../../../../../utils/Api/apiResponse.util";
import type { RowDataPacket } from "mysql2";

import { requireManager } from "../../../../../../utils/Auth/Auth.requireRole.util";
import { generateULID } from "../../../../../../utils/generateULID.util";
import { getPool } from "../../../../../../lib/Database/main.db";
import { getCurrentDateTime } from "../../../../../../utils/ValueFetcher/getDateTime.util";
import { auditLog } from "../../../../../../services/AuditLog.service";
import {
  optionValueCreateSchema,
  optionValueDeleteSchema,
  optionValueUpdateSchema,
} from "../../../../../../utils/zod/product/manager.option.zod";
import { toPascalCase } from "../../../../../../utils/Formator/toPascalCase.util";

/* -------------------------------------------------------------------------- */
/*  Row types — must extend RowDataPacket for mysql2's generic query()        */
/* -------------------------------------------------------------------------- */

interface ValueRow extends RowDataPacket {
  id: string;
  option_id: string;
  value: string;
  option_name: string;
}

interface OptionIdRow extends RowDataPacket {
  id: string;
  name: string;
}

interface CountRow extends RowDataPacket {
  total: number | string;
}

interface IdRow extends RowDataPacket {
  id: string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const VALUE_SELECT = `
  SELECT v.id, v.option_id, v.value, o.name AS option_name
    FROM global_option_values v
    JOIN global_options o ON o.id = v.option_id`;

/* -------------------------------------------------------------------------- */
/*  POST /api/manager/product-studio/options/values                           */
/*  Add a value to an option — Yellow, Red, Blue under Color.                 */
/* -------------------------------------------------------------------------- */

/**
 * Adds a value to a global option (for example Yellow under Color).
 *
 * @async
 * @function POST
 * @description Validates with `optionValueCreateSchema`, stores the value in Pascal case,
 *              confirms the parent option exists, refuses a duplicate value inside the same
 *              option, inserts into `global_option_values` with an `optv` ULID id and audits
 *              the creation.
 *
 * @param {NextRequest} req - The incoming HTTP request with a JSON body
 * @body {string} optionId - Parent option id (10-40 chars)
 * @body {string} value - Value text (1-100 chars, stored in Pascal case)
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - message: "Value added"
 *   - value: `{ id, value }`
 *
 * @throws {400} Validation failed - Schema errors, unknown option, duplicate value
 * @throws {401} Unauthorized - No session, role too low, or session without a user id
 * @throws {403} Forbidden - Account not active or no role assigned
 * @throws {500} `server_error` - Database failure while reading or inserting option values
 *
 * @description Workflow:
 *   1. Initialize the manager guard and read the manager id, returning 401 when missing
 *   2. Parse the JSON body and validate it with `optionValueCreateSchema`
 *   3. Convert the value with `toPascalCase`
 *   4. Initialize the database pool and take a connection
 *   5. Load the parent option and reject a missing one as a field error
 *   6. Reject a value that already exists under that option
 *   7. Generate the `optv` ULID and current timestamp
 *   8. Insert into `global_option_values` (creator recorded, `updated_by` null)
 *   9. Write a CREATE / OPTION_VALUE audit entry, swallowing audit errors
 *   10. Return 201 response with the new value
 *   11. Map `ER_DUP_ENTRY` to a value field error, else 500
 *   12. Release the connection in `finally`
 */
export async function POST(req: NextRequest) {
  const guard = await requireManager({
    label: "POST /api/manager/product-studio/options/values",
  });
  if (!guard.ok) return guard.response;

  const managerId = guard.session.user.id;
  if (!managerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = optionValueCreateSchema.safeParse(json);
  if (!parsed.success) {
    return invalidInput(parsed.error.flatten().fieldErrors);
  }
  const { optionId, value: rawValue } = parsed.data;
  /** Values are always stored in Pascal case. */
  const value = toPascalCase(rawValue);

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const [optionRows] = await conn.query<OptionIdRow[]>(
      `SELECT id, name FROM global_options WHERE id = ? LIMIT 1`,
      [optionId],
    );
    const option = optionRows[0];
    if (!option) {
      return invalidInput({ optionId: ["Option not found"] });
    }

    const [taken] = await conn.query<IdRow[]>(
      `SELECT id FROM global_option_values
        WHERE option_id = ? AND value = ? LIMIT 1`,
      [optionId, value],
    );
    if (taken.length > 0) {
      return invalidInput({ value: ["This value already exists"] });
    }

    const id = generateULID("optv");
    const now = getCurrentDateTime();

    await conn.query(
      `INSERT INTO global_option_values
         (id, option_id, value, created_by, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, ?, NULL)`,
      [id, optionId, value, managerId, now],
    );

    try {
      await auditLog.log(pool, {
        userId: managerId,
        action: "CREATE",
        entityType: "OPTION_VALUE",
        entityId: id,
        description: `Global option value created. [id=${id}, option=${option.name}, value=${value}]`,
      });
    } catch {
      /* audit must never break the response */
    }

    return NextResponse.json(
      { ok: true, message: "Value added", value: { id, value } },
      { status: 201 },
    );
  } catch (err) {
    if (isDuplicateEntry(err)) {
      return invalidInput({ value: ["This value already exists"] });
    }
    console.error("[GLOBAL OPTION VALUES - CREATE - POST]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  } finally {
    conn.release();
  }
}

/* -------------------------------------------------------------------------- */
/*  PUT /api/manager/product-studio/options/values                            */
/*  Rename a value. Body: { id, value }.                                       */
/* -------------------------------------------------------------------------- */

/**
 * Renames a global option value.
 *
 * @async
 * @function PUT
 * @description Validates with `optionValueUpdateSchema`, returns 404 when the value is missing,
 *              refuses a name that already exists inside the same option, updates the row and
 *              audits the old-to-new change.
 *
 * @param {NextRequest} req - The incoming HTTP request with a JSON body
 * @body {string} id - Value id (10-40 chars)
 * @body {string} value - New value text (1-100 chars)
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - message: "Value updated"
 *
 * @throws {400} Validation failed - Schema errors or a duplicate value in the same option
 * @throws {401} Unauthorized - No session, role too low, or session without a user id
 * @throws {403} Forbidden - Account not active or no role assigned
 * @throws {404} "Value not found"
 * @throws {500} `server_error` - Database failure while reading or updating option values
 *
 * @description Workflow:
 *   1. Initialize the manager guard and read the manager id, returning 401 when missing
 *   2. Parse the JSON body and validate it with `optionValueUpdateSchema`
 *   3. Initialize the database pool and take a connection
 *   4. Load the value through `VALUE_SELECT`, returning 404 when missing
 *   5. Reject a value already used by a different row of the same option
 *   6. Update `global_option_values` (value, `updated_by`, `updated_at`)
 *   7. Write an UPDATE / OPTION_VALUE audit entry with the old and new value
 *   8. Return 200 response with `{ ok: true, message: "Value updated" }`
 *   9. Map `ER_DUP_ENTRY` to a value field error, else 500
 *   10. Release the connection in `finally`
 */
export async function PUT(req: NextRequest) {
  const guard = await requireManager({
    label: "PUT /api/manager/product-studio/options/values",
  });
  if (!guard.ok) return guard.response;

  const managerId = guard.session.user.id;
  if (!managerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = optionValueUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return invalidInput(parsed.error.flatten().fieldErrors);
  }
  const { id, value } = parsed.data;

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const [existingRows] = await conn.query<ValueRow[]>(
      `${VALUE_SELECT} WHERE v.id = ? LIMIT 1`,
      [id],
    );
    const existing = existingRows[0];
    if (!existing) {
      return NextResponse.json({ error: "Value not found" }, { status: 404 });
    }

    const [taken] = await conn.query<IdRow[]>(
      `SELECT id FROM global_option_values
        WHERE option_id = ? AND value = ? AND id <> ? LIMIT 1`,
      [existing.option_id, value, id],
    );
    if (taken.length > 0) {
      return invalidInput({ value: ["This value already exists"] });
    }

    await conn.query(
      `UPDATE global_option_values
          SET value = ?, updated_by = ?, updated_at = ?
        WHERE id = ?`,
      [value, managerId, getCurrentDateTime(), id],
    );

    try {
      await auditLog.log(pool, {
        userId: managerId,
        action: "UPDATE",
        entityType: "OPTION_VALUE",
        entityId: id,
        description: `Global option value updated. [id=${id}, option=${existing.option_name}, ${existing.value} → ${value}]`,
      });
    } catch {
      /* audit must never break the response */
    }

    return NextResponse.json({ ok: true, message: "Value updated" });
  } catch (err) {
    if (isDuplicateEntry(err)) {
      return invalidInput({ value: ["This value already exists"] });
    }
    console.error("[GLOBAL OPTION VALUES - UPDATE - PUT]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  } finally {
    conn.release();
  }
}

/* -------------------------------------------------------------------------- */
/*  DELETE /api/manager/product-studio/options/values?id=<id>                 */
/*  Blocked while a product variant still uses the value.                     */
/* -------------------------------------------------------------------------- */

/**
 * Deletes a global option value once no product variant uses it.
 *
 * @async
 * @function DELETE
 * @description Reads the id from `?id=` first and falls back to a JSON body `id`, validates it
 *              with `optionValueDeleteSchema`, refuses with 409 while
 *              `product_option_values.global_option_value_id` still references the value, then
 *              deletes the row and audits it.
 *
 * @param {NextRequest} req - The incoming HTTP request with `?id=` or a JSON body
 * @query {string} id - Value id (10-40 chars); used when present, otherwise the body id wins
 * @body {string} [id] - Value id, read only when the query string has none (10-40 chars)
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - message: "Value deleted"
 *   - deletedId: the removed value id
 *
 * @throws {400} Validation failed - `id` is missing or not a valid value id
 * @throws {401} Unauthorized - No session, role too low, or session without a user id
 * @throws {403} Forbidden - Account not active or no role assigned
 * @throws {404} "Value not found"
 * @throws {409} The value is still used by product options
 * @throws {500} `server_error` - Database failure while reading or deleting option values
 *
 * @description Workflow:
 *   1. Initialize the manager guard and read the manager id, returning 401 when missing
 *   2. Read `id` from the query string, falling back to the parsed JSON body
 *   3. Validate with `optionValueDeleteSchema`
 *   4. Initialize the database pool and take a connection
 *   5. Load the value through `VALUE_SELECT`, returning 404 when missing
 *   6. Count `product_option_values` rows using the value and return 409 when non-zero
 *   7. Delete the row from `global_option_values`
 *   8. Write a DELETE / OPTION_VALUE audit entry with the option name and value
 *   9. Return 200 response with `ok`, `message` and `deletedId`
 *   10. Release the connection in `finally`
 */
export async function DELETE(req: NextRequest) {
  const guard = await requireManager({
    label: "DELETE /api/manager/product-studio/options/values",
  });
  if (!guard.ok) return guard.response;

  const managerId = guard.session.user.id;
  if (!managerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const rawId =
    req.nextUrl.searchParams.get("id") ??
    (body && typeof body === "object" && "id" in body
      ? String((body as { id?: unknown }).id ?? "")
      : "");

  const parsed = optionValueDeleteSchema.safeParse({ id: rawId });
  if (!parsed.success) {
    return invalidInput({ id: ["A valid value id is required"] });
  }
  const { id } = parsed.data;

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const [existingRows] = await conn.query<ValueRow[]>(
      `${VALUE_SELECT} WHERE v.id = ? LIMIT 1`,
      [id],
    );
    const existing = existingRows[0];
    if (!existing) {
      return NextResponse.json({ error: "Value not found" }, { status: 404 });
    }

    const [usage] = await conn.query<CountRow[]>(
      `SELECT COUNT(*) AS total FROM product_option_values
        WHERE global_option_value_id = ?`,
      [id],
    );
    const usedBy = Number(usage[0]?.total ?? 0);
    if (usedBy > 0) {
      return NextResponse.json(
        {
          error: `"${existing.value}" is used by ${usedBy} product option${usedBy === 1 ? "" : "s"}. Remove it from them before deleting.`,
        },
        { status: 409 },
      );
    }

    await conn.query(`DELETE FROM global_option_values WHERE id = ?`, [id]);

    try {
      await auditLog.log(pool, {
        userId: managerId,
        action: "DELETE",
        entityType: "OPTION_VALUE",
        entityId: id,
        description: `Global option value deleted. [id=${id}, option=${existing.option_name}, value=${existing.value}]`,
      });
    } catch {
      /* audit must never break the response */
    }

    return NextResponse.json({ ok: true, message: "Value deleted", deletedId: id });
  } catch (err) {
    console.error("[GLOBAL OPTION VALUES - DELETE]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  } finally {
    conn.release();
  }
}
