import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { slugify } from "../../../../../../utils/Slug/slug.util";
import { requireManager } from "../../../../../../utils/Auth/Auth.requireRole.util";
import { generateVariantsSchema } from "../../../../../../utils/zod/product/manager.productDetail.zod";
import { getPool } from "../../../../../../lib/Database/main.db";
import { suggestPrice } from "../../../../../../utils/Pricing/pricing.util";
import { getCurrentDateTime } from "../../../../../../utils/ValueFetcher/getDateTime.util";
import { generateULID } from "../../../../../../utils/generateULID.util";
import { auditLog } from "../../../../../../services/AuditLog.service";

/* -------------------------------------------------------------------------- */
/*  Row types — must extend RowDataPacket for mysql2's generic query()        */
/* -------------------------------------------------------------------------- */

interface ProductRow extends RowDataPacket {
  id: string;
  code: string;
  name: string;
  status: "active" | "inactive";
}

interface OptionRow extends RowDataPacket {
  id: string;
  name: string;
}

interface OptionValueRow extends RowDataPacket {
  id: string;
  option_id: string;
  value: string;
}

interface IdRow extends RowDataPacket {
  id: string;
}

interface CountRow extends RowDataPacket {
  total: number | string;
}

/* -------------------------------------------------------------------------- */
/*  Variant generation                                                        */
/* -------------------------------------------------------------------------- */
/*
 *  TODO — variant generation, next iteration
 *  ─────────────────────────────────────────
 *  1. `mode: "missing"` (generate only the combinations that do not exist yet)
 *     is not implemented. It needs the existing combination signature
 *     (sorted product_option_value ids) per variant before it can diff.
 *
 *  2. Regenerating when variants already exist is blocked here. Before it is
 *     allowed, check for "acting" orders:
 *        SELECT COUNT(*) FROM order_items oi
 *          JOIN orders o ON o.id = oi.order_id
 *         WHERE oi.variant_id IN (<variants of this product>)
 *           AND o.order_status NOT IN ('delivered', 'cancelled');
 *     Non-zero → refuse and tell the manager which orders still need the
 *     variants. Otherwise archive/soft-delete, never DELETE a variant that
 *     `order_items` still references (its FK is ON DELETE RESTRICT).
 *
 *  3. Pricing defaults to `suggestPrice()`, which is still the flat ₹100
 *     placeholder — see src/utils/Pricing/pricing.util.ts.
 * -------------------------------------------------------------------------- */

/** SKU-safe token for one option value: "Rose Pink" → "ROSEPINK". */
function skuToken(value: string): string {
  const token = slugify(value, { maxLength: 16, fallback: "v" })
    .replace(/-/g, "")
    .toUpperCase();
  return token || "V";
}

/* -------------------------------------------------------------------------- */
/*  POST /api/manager/product-studio/[id]/variants                            */
/*  Build one variant per combination of the product's option values.         */
/* -------------------------------------------------------------------------- */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireManager({
    label: "POST /api/manager/product-studio/[id]/variants",
  });
  if (!guard.ok) return guard.response;

  const managerId = guard.session.user.id;
  if (!managerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id || id.length < 10) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  const json = await req.json().catch(() => null);
  const parsed = generateVariantsSchema.safeParse(json ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const [productRows] = await conn.query<ProductRow[]>(
      `SELECT id, code, name, status FROM products WHERE id = ? LIMIT 1`,
      [id],
    );
    const product = productRows[0];
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const [optionRows] = await conn.query<OptionRow[]>(
      `SELECT id, name FROM product_options WHERE product_id = ? ORDER BY created_at ASC, id ASC`,
      [id],
    );

    const [valueRows] = await conn.query<OptionValueRow[]>(
      `SELECT v.id, v.option_id, v.value
         FROM product_option_values v
         JOIN product_options o ON o.id = v.option_id
        WHERE o.product_id = ?
        ORDER BY v.created_at ASC, v.id ASC`,
      [id],
    );

    if (optionRows.length === 0) {
      return NextResponse.json(
        {
          error:
            "This product has no options yet. Add at least one option with values before generating variants.",
        },
        { status: 400 },
      );
    }

    const valuesByOption = new Map<string, { id: string; value: string }[]>();
    for (const row of valueRows) {
      const list = valuesByOption.get(row.option_id) ?? [];
      list.push({ id: row.id, value: row.value });
      valuesByOption.set(row.option_id, list);
    }

    const emptyOption = optionRows.find(
      (option) => (valuesByOption.get(option.id) ?? []).length === 0,
    );
    if (emptyOption) {
      return NextResponse.json(
        {
          error: `"${emptyOption.name}" has no values. Add at least one value before generating variants.`,
        },
        { status: 400 },
      );
    }

    const [existingRows] = await conn.query<CountRow[]>(
      `SELECT COUNT(*) AS total FROM product_variants WHERE product_id = ?`,
      [id],
    );
    const existingCount = Number(existingRows[0]?.total ?? 0);

    if (existingCount > 0) {
      return NextResponse.json(
        {
          error: `${existingCount} variant${existingCount === 1 ? "" : "s"} already exist. Regenerating is not available yet — see the TODO in the variants route (active-order check + safe replacement).`,
        },
        { status: 409 },
      );
    }

    /* ---- cartesian product of the option values ---- */
    type ComboPart = {
      optionId: string;
      optionName: string;
      valueId: string;
      value: string;
    };

    let combos: ComboPart[][] = [[]];
    for (const option of optionRows) {
      const values = valuesByOption.get(option.id) ?? [];
      const next: ComboPart[][] = [];
      for (const combo of combos) {
        for (const value of values) {
          next.push([
            ...combo,
            {
              optionId: option.id,
              optionName: option.name,
              valueId: value.id,
              value: value.value,
            },
          ]);
        }
      }
      combos = next;
    }

    if (combos.length > 200) {
      return NextResponse.json(
        {
          error: `This would create ${combos.length} variants. Reduce the option values (max 200 at a time).`,
        },
        { status: 400 },
      );
    }

    const price = data.startingPrice || suggestPrice();
    const now = getCurrentDateTime();

    await conn.beginTransaction();

    const created: { id: string; name: string; sku: string }[] = [];

    for (const combo of combos) {
      const suffix = combo.map((part) => skuToken(part.value)).join("-");
      const skuBase = `${product.code}-${suffix}`.slice(0, 84);

      let sku = skuBase;
      let attempt = 2;
      for (;;) {
        const [taken] = await conn.query<IdRow[]>(
          `SELECT id FROM product_variants WHERE sku = ? LIMIT 1`,
          [sku],
        );
        if (taken.length === 0) break;
        const tail = `-${attempt}`;
        sku = `${skuBase.slice(0, 100 - tail.length)}${tail}`;
        attempt += 1;
        if (attempt > 60) {
          throw new Error(`Could not build a unique SKU from ${skuBase}`);
        }
      }

      const label = combo.map((part) => part.value).join(" / ");
      const name = `${product.name} — ${label}`.slice(0, 150);
      const variantId = generateULID("var");

      await conn.query(
        `INSERT INTO product_variants
           (id, product_id, name, description, brief_description, sku,
            price, compare_at_price, stock, weight, status,
            is_featured, main_showcase, orders_count,
            created_by, updated_by, created_at, updated_at)
         VALUES (?, ?, ?, NULL, NULL, ?, ?, ?, ?, NULL, ?, 0, 0, 0, ?, NULL, ?, NULL)`,
        [
          variantId,
          id,
          name,
          sku,
          price,
          data.compareAtPrice ?? null,
          data.stock,
          product.status,
          managerId,
          now,
        ],
      );

      const comboValueIds = combo.map((part) => part.valueId);

      if (comboValueIds.length > 0) {
        await conn.query(
          `INSERT INTO variant_option_values (variant_id, option_value_id) VALUES ?`,
          [comboValueIds.map((valueId) => [variantId, valueId])],
        );
      }

      created.push({ id: variantId, name, sku });
    }

    await conn.query(
      `UPDATE products SET updated_by = ?, updated_at = ? WHERE id = ?`,
      [managerId, now, id],
    );

    await conn.commit();

    try {
      await auditLog.log(pool, {
        userId: managerId,
        action: "CREATE",
        entityType: "VARIANT",
        entityId: id,
        description: `Generated ${created.length} variant${created.length === 1 ? "" : "s"}. [productId=${id}, price=${price}, stock=${data.stock}]`,
        metadata: { variants: created.map((v) => v.sku) },
      });
    } catch {
      /* audit must never break the response */
    }

    return NextResponse.json(
      {
        ok: true,
        message: `${created.length} variant${created.length === 1 ? "" : "s"} generated`,
        createdCount: created.length,
        variants: created,
      },
      { status: 201 },
    );
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error("[PRODUCT STUDIO - VARIANTS - GENERATE]", err);
    return NextResponse.json(
      { error: "Could not generate the variants" },
      { status: 500 },
    );
  } finally {
    conn.release();
  }
}
