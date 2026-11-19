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
  brief_description: string | null;
  description: string | null;
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

interface ExistingValueRow extends RowDataPacket {
  variant_id: string;
  option_value_id: string;
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
      `SELECT id, code, name, brief_description, description, status
         FROM products WHERE id = ? LIMIT 1`,
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

    /* ---- which combinations already exist? ---- */
    const [existingRows] = await conn.query<ExistingValueRow[]>(
      `SELECT vov.variant_id, vov.option_value_id
         FROM variant_option_values vov
         JOIN product_variants v ON v.id = vov.variant_id
        WHERE v.product_id = ?`,
      [id],
    );
    const valuesByExisting = new Map<string, string[]>();
    for (const row of existingRows) {
      const list = valuesByExisting.get(row.variant_id) ?? [];
      list.push(row.option_value_id);
      valuesByExisting.set(row.variant_id, list);
    }
    const existingSignatures = new Set(
      [...valuesByExisting.values()].map((valueIds) =>
        [...valueIds].sort().join("|"),
      ),
    );

    type ComboPart = {
      optionId: string;
      optionName: string;
      valueId: string;
      value: string;
    };

    const valuesById = new Map(valueRows.map((row) => [row.id, row]));
    const combos: ComboPart[][] = [];

    if (data.mode === "selected") {
      const selected = data.combinations ?? [];
      if (selected.length === 0) {
        return NextResponse.json(
          { error: "Pick at least one combination to generate" },
          { status: 400 },
        );
      }

      const seen = new Set<string>();
      for (const valueIds of selected) {
        if (valueIds.length !== optionRows.length) {
          return NextResponse.json(
            {
              error:
                "Every selected combination must pick exactly one value for each option",
            },
            { status: 400 },
          );
        }

        const parts: ComboPart[] = [];
        const chosenOptions = new Set<string>();
        let valid = true;

        for (const option of optionRows) {
          const valueId = valueIds.find(
            (candidate) => valuesById.get(candidate)?.option_id === option.id,
          );
          const value = valueId ? valuesById.get(valueId) : undefined;
          if (!value || chosenOptions.has(option.id)) {
            valid = false;
            break;
          }
          chosenOptions.add(option.id);
          parts.push({
            optionId: option.id,
            optionName: option.name,
            valueId: value.id,
            value: value.value,
          });
        }

        if (!valid || chosenOptions.size !== optionRows.length) {
          return NextResponse.json(
            {
              error:
                "One of the selected combinations uses values that do not belong to this product",
            },
            { status: 400 },
          );
        }

        const signature = parts
          .map((part) => part.valueId)
          .sort()
          .join("|");
        if (seen.has(signature)) continue;
        seen.add(signature);
        combos.push(parts);
      }
    } else {
      /* ---- cartesian product of the option values ---- */
      let cartesian: ComboPart[][] = [[]];
      for (const option of optionRows) {
        const values = valuesByOption.get(option.id) ?? [];
        const next: ComboPart[][] = [];
        for (const combo of cartesian) {
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
        cartesian = next;
      }
      combos.push(...cartesian);
    }

    if (combos.length === 0) {
      return NextResponse.json(
        { error: "Pick at least one combination to generate" },
        { status: 400 },
      );
    }

    if (combos.length > 200) {
      return NextResponse.json(
        {
          error: `This would create ${combos.length} variants. Reduce the option values (max 200 at a time).`,
        },
        { status: 400 },
      );
    }

    /* Existing combinations are skipped, never rebuilt: this lets a manager
       add just the missing pairs (e.g. Yellow / Small) without touching
       variants that already have prices, stock or orders. */
    const pending = combos.filter((combo) => {
      const signature = combo
        .map((part) => part.valueId)
        .sort()
        .join("|");
      return !existingSignatures.has(signature);
    });
    const skippedCount = combos.length - pending.length;

    if (pending.length === 0) {
      return NextResponse.json({
        ok: true,
        message: `All ${combos.length} selected combination${combos.length === 1 ? "" : "s"} already exist`,
        createdCount: 0,
        skippedCount,
        variants: [],
      });
    }

    const price = data.startingPrice || suggestPrice();
    const now = getCurrentDateTime();

    await conn.beginTransaction();

    const created: { id: string; name: string; sku: string }[] = [];

    for (const combo of pending) {
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
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 0, 0, 0, ?, NULL, ?, NULL)`,
        [
          variantId,
          id,
          name,
          product.description,
          product.brief_description,
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
        description: `Generated ${created.length} variant${created.length === 1 ? "" : "s"} (${skippedCount} already existed). [productId=${id}, price=${price}, stock=${data.stock}]`,
        metadata: { variants: created.map((v) => v.sku) },
      });
    } catch {
      /* audit must never break the response */
    }

    return NextResponse.json(
      {
        ok: true,
        message:
          `${created.length} variant${created.length === 1 ? "" : "s"} generated` +
          (skippedCount > 0
            ? ` · ${skippedCount} already existed`
            : ""),
        createdCount: created.length,
        skippedCount,
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
