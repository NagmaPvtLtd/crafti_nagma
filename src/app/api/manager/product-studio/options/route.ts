import { NextRequest, NextResponse } from "next/server";
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
/*  GET /api/manager/product-studio/options                                   */
/*  Every option with its values nested, plus totals for the stat strip.      */
/* -------------------------------------------------------------------------- */

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
  const { name, description } = parsed.data;

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const [taken] = await conn.query<IdRow[]>(
      `SELECT id FROM global_options WHERE name = ? LIMIT 1`,
      [name],
    );
    if (taken.length > 0) {
      return invalidInput({ name: ["An option with this name already exists"] });
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
      return invalidInput({ name: ["An option with this name already exists"] });
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
      return invalidInput({ name: ["An option with this name already exists"] });
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
      return invalidInput({ name: ["An option with this name already exists"] });
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

    return NextResponse.json({ ok: true, message: "Option deleted", deletedId: id });
  } catch (err) {
    console.error("[GLOBAL OPTIONS - DELETE]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  } finally {
    conn.release();
  }
}
