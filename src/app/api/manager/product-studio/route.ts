import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";

import { requireManager } from "../../../../utils/Auth/Auth.requireRole.util";
import { generateULID } from "../../../../utils/generateULID.util";
import { ulid } from "ulid";
import { getPool } from "../../../../lib/Database/main.db";
import { getCurrentDateTime } from "../../../../utils/ValueFetcher/getDateTime.util";
import { auditLog } from "../../../../services/AuditLog.service";
import { baseProductCreateSchema } from "../../../../utils/zod/product/manager.product.zod";
import { buildUniqueSlug, slugify } from "../../../../utils/Slug/slug.util";

/* -------------------------------------------------------------------------- */
/*  Row types — must extend RowDataPacket for mysql2's generic query()        */
/* -------------------------------------------------------------------------- */

interface IdRow extends RowDataPacket {
  id: string;
}

interface OptionRow extends RowDataPacket {
  id: string;
  name: string;
  description: string | null;
}

interface ValueRow extends RowDataPacket {
  id: string;
  option_id: string;
  value: string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/** "Crochet Bouquets" → "CROCHET-BOUQUETS". */
function codeBase(name: string): string {
  return slugify(name, { fallback: "product", maxLength: 44 }).toUpperCase();
}

/** Internal, unique reference — the name plus 4 random characters. */
function newCode(name: string): string {
  const suffix = ulid().slice(0, 4).toUpperCase();
  return `${codeBase(name)}-${suffix}`;
}

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
/*  GET /api/manager/product-studio                                            */
/*  Product listing is not built yet — it stays a 503 until it is.            */
/* -------------------------------------------------------------------------- */

export async function GET() {
  return NextResponse.json({ error: "WORK IN PROGRESS" }, { status: 503 });
}

/* -------------------------------------------------------------------------- */
/*  POST /api/manager/product-studio                                          */
/*  Create a base product: code + slug generated, categories and the option   */
/*  pool attached. A base product is never purchasable — variants are.        */
/* -------------------------------------------------------------------------- */

export async function POST(req: NextRequest) {
  const guard = await requireManager({
    label: "POST /api/manager/product-studio",
  });
  if (!guard.ok) return guard.response;

  const managerId = guard.session.user.id;
  if (!managerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = baseProductCreateSchema.safeParse(json);
  if (!parsed.success) {
    return invalidInput(parsed.error.flatten().fieldErrors);
  }
  const data = parsed.data;

  /* ---- de-duplicate the selections, merging repeated options ---- */
  const categoryIds = [...new Set(data.categoryIds)];

  const optionMap = new Map<string, string[]>();
  for (const option of data.options) {
    const existing = optionMap.get(option.optionId) ?? [];
    optionMap.set(option.optionId, [...new Set([...existing, ...option.valueIds])]);
  }
  const optionRequests = [...optionMap.entries()].map(([optionId, valueIds]) => ({
    optionId,
    valueIds,
  }));
  const optionIds = optionRequests.map((o) => o.optionId);

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    /* ---- categories must exist ---- */
    const [categoryRows] = await conn.query<IdRow[]>(
      `SELECT id FROM categories WHERE id IN (?)`,
      [categoryIds],
    );
    if (categoryRows.length !== categoryIds.length) {
      await conn.rollback();
      return invalidInput({
        categoryIds: ["One or more categories no longer exist"],
      });
    }

    /* ---- options must exist ---- */
    const [optionRows] = await conn.query<OptionRow[]>(
      `SELECT id, name, description FROM global_options WHERE id IN (?)`,
      [optionIds],
    );
    if (optionRows.length !== optionIds.length) {
      await conn.rollback();
      return invalidInput({ options: ["One or more options no longer exist"] });
    }

    /* ---- every value must belong to its option ---- */
    const allValueIds = [
      ...new Set(optionRequests.flatMap((o) => o.valueIds)),
    ];
    const [valueRows] = await conn.query<ValueRow[]>(
      `SELECT id, option_id, value FROM global_option_values WHERE id IN (?)`,
      [allValueIds],
    );
    const valueById = new Map(valueRows.map((v) => [v.id, v]));

    for (const request of optionRequests) {
      for (const valueId of request.valueIds) {
        const value = valueById.get(valueId);
        if (!value || value.option_id !== request.optionId) {
          await conn.rollback();
          return invalidInput({
            options: ["A selected value does not belong to its option"],
          });
        }
      }
    }

    /* ---- identity ---- */
    const productId = generateULID("prod");
    const now = getCurrentDateTime();
    const slug = await buildUniqueSlug(
      conn,
      "products",
      slugify(data.name, { fallback: "product" }),
    );

    let code = newCode(data.name);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const [taken] = await conn.query<IdRow[]>(
        `SELECT id FROM products WHERE code = ? LIMIT 1`,
        [code],
      );
      if (taken.length === 0) break;
      code = newCode(data.name);
    }

    /* ---- product ---- */
    await conn.query(
      `INSERT INTO products
         (id, code, name, slug,
          brief_description, description,
          meta_title, meta_description,
          delivery_charges, processing_time,
          is_featured, main_showcase, orders_count, status,
          created_by, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, 0, ?, ?, NULL, ?, NULL)`,
      [
        productId,
        code,
        data.name,
        slug,
        data.briefDescription || null,
        data.description || null,
        data.metaTitle || null,
        data.metaDescription || null,
        data.deliveryCharges,
        data.isFeatured ? 1 : 0,
        data.mainShowcase ? 1 : 0,
        data.status,
        managerId,
        now,
      ],
    );

    /* ---- categories ---- */
    await conn.query(
      `INSERT INTO product_categories (product_id, category_id) VALUES ?`,
      [categoryIds.map((categoryId) => [productId, categoryId])],
    );

    /* ---- options + their values ---- */
    for (const request of optionRequests) {
      const option = optionRows.find((o) => o.id === request.optionId)!;
      const productOptionId = generateULID("po");

      await conn.query(
        `INSERT INTO product_options
           (id, product_id, global_option_id, name, description,
            created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          productOptionId,
          productId,
          option.id,
          option.name,
          option.description,
          managerId,
          now,
        ],
      );

      await conn.query(
        `INSERT INTO product_option_values
           (id, option_id, global_option_value_id, value, created_by, created_at)
         VALUES ?`,
        [
          request.valueIds.map((valueId) => [
            generateULID("pov"),
            productOptionId,
            valueId,
            valueById.get(valueId)!.value,
            managerId,
            now,
          ]),
        ],
      );
    }

    await conn.commit();

    try {
      await auditLog.log(pool, {
        userId: managerId,
        action: "CREATE",
        entityType: "PRODUCT",
        entityId: productId,
        description: `Base product created. [id=${productId}, code=${code}, name=${data.name}, categories=${categoryIds.length}, options=${optionRequests.length}]`,
      });
    } catch {
      /* audit must never break the response */
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Base product created",
        product: {
          id: productId,
          code,
          slug,
          name: data.name,
          status: data.status,
          categoryCount: categoryIds.length,
          optionCount: optionRequests.length,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    await conn.rollback().catch(() => {});
    if (isDuplicateEntry(err)) {
      return NextResponse.json(
        {
          error: "Could not save the product",
          details: { name: ["A product with this name already exists — try again"] },
        },
        { status: 409 },
      );
    }
    console.error("[PRODUCT STUDIO - CREATE - POST]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  } finally {
    conn.release();
  }
}
