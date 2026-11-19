import { NextRequest, NextResponse } from "next/server";
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

function invalidInput(details: Record<string, string[]>) {
  return NextResponse.json(
    { error: "Validation failed", details },
    { status: 400 },
  );
}

function isDuplicateEntry(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "ER_DUP_ENTRY"
  );
}

/* -------------------------------------------------------------------------- */
/*  POST /api/manager/product-studio/options/values                           */
/*  Add a value to an option — Yellow, Red, Blue under Color.                 */
/* -------------------------------------------------------------------------- */

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
  const { optionId, value } = parsed.data;

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
