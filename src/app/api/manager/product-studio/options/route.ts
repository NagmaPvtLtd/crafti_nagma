import { NextRequest, NextResponse } from "next/server";
import {
  invalidInput,
  isDuplicateEntry,
} from "../../../../../utils/Api/apiResponse.util";
import type { RowDataPacket } from "mysql2";

import { requireManager } from "../../../../../utils/Auth/Auth.requireRole.util";
import { generateULID } from "../../../../../utils/generateULID.util";
import { getPool } from "../../../../../lib/Database/main.db";
import { getCurrentDateTime } from "../../../../../utils/ValueFetcher/getDateTime.util";
import { auditLog } from "../../../../../services/AuditLog.service";
import {
  optionCreateSchema,
  optionDeleteSchema,
  optionUpdateSchema,
} from "../../../../../utils/zod/product/manager.option.zod";
import { toPascalCase } from "../../../../../utils/Formator/toPascalCase.util";

/* -------------------------------------------------------------------------- */
/*  Row types — must extend RowDataPacket for mysql2's generic query()        */
/* -------------------------------------------------------------------------- */

interface OptionRow extends RowDataPacket {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string | null;
  value_count: number | string;
  product_count: number | string;
}

interface OptionValueRow extends RowDataPacket {
  id: string;
  option_id: string;
  value: string;
}

interface OptionTotalsRow extends RowDataPacket {
  total: number | string;
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

const OPTION_SELECT = `
  SELECT o.id, o.name, o.description, o.created_at, o.updated_at,
         (SELECT COUNT(*) FROM global_option_values v
           WHERE v.option_id = o.id)                          AS value_count,
         (SELECT COUNT(*) FROM product_options po
           WHERE po.global_option_id = o.id)                  AS product_count
    FROM global_options o`;

/* -------------------------------------------------------------------------- */
/*  GET /api/manager/product-studio/options                                   */
/*  Every option with its values nested, plus totals for the stat strip.      */
/* -------------------------------------------------------------------------- */

/**
 * Lists every global option with its values nested, plus stat-strip totals.
 *
 * @async
 * @function GET
 * @description Reads `global_options` with per-option value and product counts behind the
 *              manager guard, then loads all `global_option_values` and groups them by option.
 *              Also returns the total option count, total value count and how many distinct
 *              products use an option via `product_options`.
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - counts: `options`, `values` and `productsUsing`
 *   - options: each with `id`, `name`, `description`, `valueCount`, `productCount`,
 *              `values` (`id`, `value`), `createdAt` and `updatedAt`, ordered by name
 *
 * @throws {401} Unauthorized - No session
 * @throws {403} Forbidden - Account not active, no role, or role below manager
 * @throws {500} `server_error` - Database failure while reading options or values
 *
 * @description Workflow:
 *   1. Initialize the manager guard (session, active status, role rank)
 *   2. Initialize the database pool and take a connection
 *   3. Select options with `value_count` and `product_count` subqueries
 *   4. Select all global option values ordered by creation
 *   5. Count total options, total values and distinct products using options
 *   6. Group values into a map keyed by `option_id`
 *   7. Return 200 response with counts and options (values nested)
 *   8. Release the connection in `finally`
 */
export async function GET() {
  const guard = await requireManager({
    label: "GET /api/manager/product-studio/options",
  });
  if (!guard.ok) return guard.response;

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const [optionRows] = await conn.query<OptionRow[]>(
      `${OPTION_SELECT}
       ORDER BY o.name ASC`,
    );

    const [valueRows] = await conn.query<OptionValueRow[]>(
      `SELECT id, option_id, value
         FROM global_option_values
        ORDER BY created_at ASC, id ASC`,
    );

    const [optionTotals] = await conn.query<OptionTotalsRow[]>(
      `SELECT COUNT(*) AS total FROM global_options`,
    );

    const [valueTotals] = await conn.query<OptionTotalsRow[]>(
      `SELECT COUNT(*) AS total FROM global_option_values`,
    );

    const [productsUsing] = await conn.query<CountRow[]>(
      `SELECT COUNT(DISTINCT product_id) AS total FROM product_options`,
    );

    const valuesByOption = new Map<string, { id: string; value: string }[]>();
    for (const v of valueRows) {
      const list = valuesByOption.get(v.option_id) ?? [];
      list.push({ id: v.id, value: v.value });
      valuesByOption.set(v.option_id, list);
    }

    return NextResponse.json({
      ok: true,
      counts: {
        options: Number(optionTotals[0]?.total ?? 0),
        values: Number(valueTotals[0]?.total ?? 0),
        productsUsing: Number(productsUsing[0]?.total ?? 0),
      },
      options: optionRows.map((o) => ({
        id: o.id,
        name: o.name,
        description: o.description ?? "",
        valueCount: Number(o.value_count ?? 0),
        productCount: Number(o.product_count ?? 0),
        values: valuesByOption.get(o.id) ?? [],
        createdAt: o.created_at,
        updatedAt: o.updated_at,
      })),
    });
  } catch (err) {
    console.error("[GLOBAL OPTIONS - LIST - GET]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  } finally {
    conn.release();
  }
}

/* -------------------------------------------------------------------------- */
/*  POST /api/manager/product-studio/options                                  */
/*  Create an option pool — Color, Size, Material…                            */
/* -------------------------------------------------------------------------- */

/**
 * Creates a global option pool such as Color, Size or Material.
 *
 * @async
 * @function POST
 * @description Validates with `optionCreateSchema`, stores the name in Pascal case, refuses a
 *              name that already exists, inserts into `global_options` with an `opt` ULID id
 *              and audits the creation. New options start with no values and no products.
 *
 * @param {NextRequest} req - The incoming HTTP request with a JSON body
 * @body {string} name - Option name (2-100 chars, stored in Pascal case)
 * @body {string} [description] - Description (max 255 chars, stored as `NULL` when empty)
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - message: "Option created"
 *   - option: `id`, `name`, `description`, `valueCount: 0`, `productCount: 0`, `values: []`
 *
 * @throws {400} Validation failed - Schema errors or a duplicate name
 * @throws {401} Unauthorized - No session, role too low, or session without a user id
 * @throws {403} Forbidden - Account not active or no role assigned
 * @throws {500} `server_error` - Database failure while reading or inserting `global_options`
 *
 * @description Workflow:
 *   1. Initialize the manager guard and read the manager id, returning 401 when missing
 *   2. Parse the JSON body and validate it with `optionCreateSchema`
 *   3. Convert the name with `toPascalCase`
 *   4. Initialize the database pool and take a connection
 *   5. Check `global_options` for the same name and reject it as a field error
 *   6. Generate the `opt` ULID and current timestamp
 *   7. Insert into `global_options` (creator recorded, `updated_by` null)
 *   8. Write a CREATE / OPTION audit entry, swallowing audit errors
 *   9. Return 201 response with the new option
 *   10. Map `ER_DUP_ENTRY` to a name field error, else 500
 *   11. Release the connection in `finally`
 */
export async function POST(req: NextRequest) {
  const guard = await requireManager({
    label: "POST /api/manager/product-studio/options",
  });
  if (!guard.ok) return guard.response;

  const managerId = guard.session.user.id;
  if (!managerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = optionCreateSchema.safeParse(json);
  if (!parsed.success) {
    return invalidInput(parsed.error.flatten().fieldErrors);
  }
  const { name: rawName, description } = parsed.data;
  /** Display names are always stored in Pascal case. */
  const name = toPascalCase(rawName);

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const [taken] = await conn.query<IdRow[]>(
      `SELECT id FROM global_options WHERE name = ? LIMIT 1`,
      [name],
    );
    if (taken.length > 0) {
      return invalidInput({
        name: ["An option with this name already exists"],
      });
    }

    const id = generateULID("opt");
    const now = getCurrentDateTime();

    await conn.query(
      `INSERT INTO global_options
         (id, name, description, created_by, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, ?, NULL)`,
      [id, name, description || null, managerId, now],
    );

    try {
      await auditLog.log(pool, {
        userId: managerId,
        action: "CREATE",
        entityType: "OPTION",
        entityId: id,
        description: `Global option created. [id=${id}, name=${name}]`,
      });
    } catch {
      /* audit must never break the response */
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Option created",
        option: {
          id,
          name,
          description,
          valueCount: 0,
          productCount: 0,
          values: [],
        },
      },
      { status: 201 },
    );
  } catch (err) {
    if (isDuplicateEntry(err)) {
      return invalidInput({
        name: ["An option with this name already exists"],
      });
    }
    console.error("[GLOBAL OPTIONS - CREATE - POST]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  } finally {
    conn.release();
  }
}

/* -------------------------------------------------------------------------- */
/*  PUT /api/manager/product-studio/options                                   */
/*  Rename an option or rewrite its description. Body must include its id.    */
/* -------------------------------------------------------------------------- */

/**
 * Renames a global option or rewrites its description.
 *
 * @async
 * @function PUT
 * @description Validates with `optionUpdateSchema` (the body carries the option `id`),
 *              returns 404 when the option is missing, refuses a name already used by another
 *              option, updates `global_options` and audits the change. Values are untouched.
 *
 * @param {NextRequest} req - The incoming HTTP request with a JSON body
 * @body {string} id - Option id (10-40 chars)
 * @body {string} name - Option name (2-100 chars)
 * @body {string} [description] - Description (max 255 chars, stored as `NULL` when empty)
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - message: "Option updated"
 *
 * @throws {400} Validation failed - Schema errors or a duplicate name
 * @throws {401} Unauthorized - No session, role too low, or session without a user id
 * @throws {403} Forbidden - Account not active or no role assigned
 * @throws {404} "Option not found"
 * @throws {500} `server_error` - Database failure while reading or updating `global_options`
 *
 * @description Workflow:
 *   1. Initialize the manager guard and read the manager id, returning 401 when missing
 *   2. Parse the JSON body and validate it with `optionUpdateSchema`
 *   3. Initialize the database pool and take a connection
 *   4. Load the option through `OPTION_SELECT`, returning 404 when missing
 *   5. Reject a name already used by a different option
 *   6. Update `global_options` (name, description, `updated_by`, `updated_at`)
 *   7. Write an UPDATE / OPTION audit entry, swallowing audit errors
 *   8. Return 200 response with `{ ok: true, message: "Option updated" }`
 *   9. Map `ER_DUP_ENTRY` to a name field error, else 500
 *   10. Release the connection in `finally`
 */
export async function PUT(req: NextRequest) {
  const guard = await requireManager({
    label: "PUT /api/manager/product-studio/options",
  });
  if (!guard.ok) return guard.response;

  const managerId = guard.session.user.id;
  if (!managerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = optionUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return invalidInput(parsed.error.flatten().fieldErrors);
  }
  const { id, name, description } = parsed.data;

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const [existingRows] = await conn.query<OptionRow[]>(
      `${OPTION_SELECT} WHERE o.id = ? LIMIT 1`,
      [id],
    );
    if (!existingRows[0]) {
      return NextResponse.json({ error: "Option not found" }, { status: 404 });
    }

    const [taken] = await conn.query<IdRow[]>(
      `SELECT id FROM global_options WHERE name = ? AND id <> ? LIMIT 1`,
      [name, id],
    );
    if (taken.length > 0) {
      return invalidInput({
        name: ["An option with this name already exists"],
      });
    }

    await conn.query(
      `UPDATE global_options
          SET name = ?, description = ?, updated_by = ?, updated_at = ?
        WHERE id = ?`,
      [name, description || null, managerId, getCurrentDateTime(), id],
    );

    try {
      await auditLog.log(pool, {
        userId: managerId,
        action: "UPDATE",
        entityType: "OPTION",
        entityId: id,
        description: `Global option updated. [id=${id}, name=${name}]`,
      });
    } catch {
      /* audit must never break the response */
    }

    return NextResponse.json({ ok: true, message: "Option updated" });
  } catch (err) {
    if (isDuplicateEntry(err)) {
      return invalidInput({
        name: ["An option with this name already exists"],
      });
    }
    console.error("[GLOBAL OPTIONS - UPDATE - PUT]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  } finally {
    conn.release();
  }
}

/* -------------------------------------------------------------------------- */
/*  DELETE /api/manager/product-studio/options?id=<id>                        */
/*  Deletes the option and (via FK cascade) all of its values.                */
/*  Blocked while a product still uses the option.                            */
/* -------------------------------------------------------------------------- */

/**
 * Deletes a global option once no product uses it.
 *
 * @async
 * @function DELETE
 * @description Reads the id from `?id=` first and falls back to a JSON body `id`, validates it
 *              with `optionDeleteSchema`, refuses with 409 while `product_options` still
 *              references the option, then deletes the row. The option's values are removed by
 *              the `global_option_values` foreign-key cascade.
 *
 * @param {NextRequest} req - The incoming HTTP request with `?id=` or a JSON body
 * @query {string} id - Option id (10-40 chars); used when present, otherwise the body id wins
 * @body {string} [id] - Option id, read only when the query string has none (10-40 chars)
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - message: "Option deleted"
 *   - deletedId: the removed option id
 *
 * @throws {400} Validation failed - `id` is missing or not a valid option id
 * @throws {401} Unauthorized - No session, role too low, or session without a user id
 * @throws {403} Forbidden - Account not active or no role assigned
 * @throws {404} "Option not found"
 * @throws {409} The option is still used by products
 * @throws {500} `server_error` - Database failure while reading or deleting `global_options`
 *
 * @description Workflow:
 *   1. Initialize the manager guard and read the manager id, returning 401 when missing
 *   2. Read `id` from the query string, falling back to the parsed JSON body
 *   3. Validate with `optionDeleteSchema`
 *   4. Initialize the database pool and take a connection
 *   5. Load the option through `OPTION_SELECT`, returning 404 when missing
 *   6. Return 409 with the using-product count while `product_options` still references it
 *   7. Delete the row from `global_options` (values cascade)
 *   8. Write a DELETE / OPTION audit entry with the value count, swallowing audit errors
 *   9. Return 200 response with `ok`, `message` and `deletedId`
 *   10. Release the connection in `finally`
 */
export async function DELETE(req: NextRequest) {
  const guard = await requireManager({
    label: "DELETE /api/manager/product-studio/options",
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

  const parsed = optionDeleteSchema.safeParse({ id: rawId });
  if (!parsed.success) {
    return invalidInput({ id: ["A valid option id is required"] });
  }
  const { id } = parsed.data;

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const [existingRows] = await conn.query<OptionRow[]>(
      `${OPTION_SELECT} WHERE o.id = ? LIMIT 1`,
      [id],
    );
    const existing = existingRows[0];
    if (!existing) {
      return NextResponse.json({ error: "Option not found" }, { status: 404 });
    }

    const productCount = Number(existing.product_count ?? 0);
    if (productCount > 0) {
      return NextResponse.json(
        {
          error: `"${existing.name}" is used by ${productCount} product${productCount === 1 ? "" : "s"}. Remove it from them before deleting.`,
        },
        { status: 409 },
      );
    }

    await conn.query(`DELETE FROM global_options WHERE id = ?`, [id]);

    try {
      await auditLog.log(pool, {
        userId: managerId,
        action: "DELETE",
        entityType: "OPTION",
        entityId: id,
        description: `Global option deleted. [id=${id}, name=${existing.name}, values=${existing.value_count}]`,
      });
    } catch {
      /* audit must never break the response */
    }

    return NextResponse.json({
      ok: true,
      message: "Option deleted",
      deletedId: id,
    });
  } catch (err) {
    console.error("[GLOBAL OPTIONS - DELETE]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  } finally {
    conn.release();
  }
}
