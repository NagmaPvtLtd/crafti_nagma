import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { buildVariantSku } from "../../../../../../utils/Formator/productIdentity.util";
import { requireManager } from "../../../../../../utils/Auth/Auth.requireRole.util";
import { generateVariantsSchema } from "../../../../../../utils/zod/product/manager.productDetail.zod";
import { getPool } from "../../../../../../lib/Database/main.db";
import { suggestPrice } from "../../../../../../utils/Pricing/pricing.util";
import { getCurrentDateTime } from "../../../../../../utils/ValueFetcher/getDateTime.util";
import { generateULID } from "../../../../../../utils/generateULID.util";
import { auditLog } from "../../../../../../services/AuditLog.service";
import { capitalizeFirst } from "../../../../../../utils/Formator/capitalize.util";

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
  length: number | string | null;
  width: number | string | null;
  height: number | string | null;
  dimension_unit: "cm" | "in" | null;
}

interface LineItemRow extends RowDataPacket {
  value: string;
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

/* -------------------------------------------------------------------------- */
/*  POST /api/manager/product-studio/[id]/variants                            */
/*  Build one variant per combination of the product's option values.         */
/* -------------------------------------------------------------------------- */

/**
 * Generates one variant per combination of the product's option values.
 *
 * @async
 * @function POST
 * @description Reads the product's options and values, then either builds the full cartesian
 *              product (`mode: "all"`) or uses the client's selection (`mode: "selected"`,
 *              exactly one value per option). Combinations that already exist are skipped, never
 *              rebuilt, so managers can add only the missing pairs. Each new variant gets an
 *              `var` ULID id, a name of "<product> — <values>", a SKU from `buildVariantSku`
 *              with a numeric suffix retry loop, the product's copy, and is inserted as
 *              `inactive`. Capped at 200 new combinations per call.
 *
 * @param {NextRequest} req - The incoming HTTP request with a JSON body
 * @param {Object} context - Next.js route context
 * @param {Promise<{ id: string }>} context.params - Route parameters (`(await context.params).id`,
 *                                                  min 10 chars, internal product id)
 *
 * @body {string} [mode] - `all` (default, full cartesian product) or `selected`
 * @body {string[][]} [combinations] - Required for `selected`: up to 200 entries, each with 1-20
 *                                     option-value ids, one per option
 * @body {number} [startingPrice] - Price for the new variants, 0-10000000 (default: `suggestPrice()`)
 * @body {number|null} [compareAtPrice] - Compare-at price, 0-10000000
 * @body {number} [stock] - Initial stock, integer 0-100000 (default: 0)
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - message: created count, noting how many already existed
 *   - createdCount: number of variants inserted
 *   - skippedCount: combinations that already existed
 *   - variants: the created `{ id, name, sku }` rows
 *
 * @throws {400} Invalid product id, schema errors, no options, an option without values,
 *               empty selection, a selection that does not match the options, more than 200
 *               combinations
 * @throws {401} Unauthorized - No session, role too low, or session without a user id
 * @throws {403} Forbidden - Account not active or no role assigned
 * @throws {404} "Product not found"
 * @throws {500} "Could not generate the variants" - Database failure, or a SKU that could not be
 *               made unique after 60 attempts
 *
 * @description Workflow:
 *   1. Initialize the manager guard and read the manager id, returning 401 when missing
 *   2. Await `context.params` and reject a product id shorter than 10 chars
 *   3. Parse the body (defaulting to `{}`) and validate it with `generateVariantsSchema`
 *   4. Initialize the database pool and take a connection
 *   5. Load the product, returning 404 when missing
 *   6. Load the product's options and option values in creation order
 *   7. Reject a product with no options
 *   8. Reject an option that has no values
 *   9. Load the existing variant/value signatures so duplicates can be detected
 *   10. For `selected`, validate each combination picks exactly one value per option and is
 *       not duplicated inside the request
 *   11. Otherwise build the cartesian product of every option's values
 *   12. Reject an empty combination list or more than 200 combinations
 *   13. Drop combinations whose sorted value-id signature already exists
 *   14. Return 200 early when every selected combination already exists
 *   15. Count the existing variants to continue the sequence
 *   16. Begin a transaction
 *   17. Per new combination: build the label, truncate the name to 150 chars, build the SKU via
 *       `buildVariantSku`, retry with a `-N` suffix up to 60 times for uniqueness
 *   18. Insert into `product_variants` as `inactive` (copy inherited from the base product)
 *   19. Insert the `variant_option_values` rows for the combination
 *   20. Touch `products.updated_at` and commit
 *   21. Write a CREATE / VARIANT audit entry with the generated SKUs, swallowing audit errors
 *   22. Return 201 response with created and skipped counts
 *   23. Roll back on error and return 500
 *   24. Release the connection in `finally`
 */
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
      `SELECT id, code, name, brief_description, description, status,
              length, width, height, dimension_unit
         FROM products WHERE id = ? LIMIT 1`,
      [id],
    );
    const product = productRows[0];
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const [optionRows] = await conn.query<OptionRow[]>(
      `SELECT id, name FROM product_options
        WHERE product_id = ? AND status = 'active'
        ORDER BY created_at ASC, id ASC`,
      [id],
    );

    const [valueRows] = await conn.query<OptionValueRow[]>(
      `SELECT v.id, v.option_id, v.value
         FROM product_option_values v
         JOIN product_options o ON o.id = v.option_id
        WHERE o.product_id = ? AND v.status = 'active' AND o.status = 'active'
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

    const [existingCountRows] = await conn.query<CountRow[]>(
      `SELECT COUNT(*) AS total FROM product_variants WHERE product_id = ?`,
      [id],
    );
    let variantSequence = Number(existingCountRows[0]?.total ?? 0);

    /* Feature bullets and care instructions are snapshotted onto every new
       variant so a material or colour can carry its own copy later. */
    const [featureRows] = await conn.query<LineItemRow[]>(
      `SELECT feature AS value
         FROM product_features
        WHERE product_id = ?
        ORDER BY sort_order ASC, created_at ASC`,
      [id],
    );
    const [careRows] = await conn.query<LineItemRow[]>(
      `SELECT instruction AS value
         FROM product_care_instructions
        WHERE product_id = ?
        ORDER BY sort_order ASC, created_at ASC`,
      [id],
    );

    const price = data.startingPrice || suggestPrice();
    const now = getCurrentDateTime();

    await conn.beginTransaction();

    const created: { id: string; name: string; sku: string }[] = [];

    for (const combo of pending) {
      variantSequence += 1;

      const variantId = generateULID("var");
      const label = combo.map((part) => part.value).join(" / ");
      const name = `${product.name} — ${label}`.slice(0, 150);

      /* PREFIX-P{YY}{NN}-{last 4 of variant id}-{VALUES} */
      const skuBase = buildVariantSku({
        productName: product.name,
        variantId,
        sequence: variantSequence,
        values: combo.map((part) => part.value),
      }).slice(0, 84);

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

      await conn.query(
        `INSERT INTO product_variants
           (id, product_id, name, description, brief_description, sku,
            price, compare_at_price, stock, weight,
            length, width, height, dimension_unit, status,
            is_featured, main_showcase, orders_count,
            created_by, updated_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, 'inactive',
                 0, 0, 0, ?, NULL, ?, NULL)`,
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
          product.length,
          product.width,
          product.height,
          product.dimension_unit,
          managerId,
          now,
        ],
      );

      if (featureRows.length > 0) {
        await conn.query(
          `INSERT INTO product_variant_features
             (id, variant_id, feature, sort_order, created_by, created_at)
           VALUES ?`,
          [
            featureRows.map((row, index) => [
              generateULID("vfeat"),
              variantId,
              capitalizeFirst(row.value),
              index,
              managerId,
              now,
            ]),
          ],
        );
      }

      if (careRows.length > 0) {
        await conn.query(
          `INSERT INTO product_variant_care_instructions
             (id, variant_id, instruction, sort_order, created_by, created_at)
           VALUES ?`,
          [
            careRows.map((row, index) => [
              generateULID("vcare"),
              variantId,
              capitalizeFirst(row.value),
              index,
              managerId,
              now,
            ]),
          ],
        );
      }

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
        description: `Generated ${created.length} variant${created.length === 1 ? "" : "s"} (inactive by default, ${skippedCount} already existed). [productId=${id}, price=${price}, stock=${data.stock}]`,
        metadata: { variants: created.map((v) => v.sku) },
      });
    } catch {
      /* audit must never break the response */
    }

    return NextResponse.json(
      {
        ok: true,
        message:
          `${created.length} variant${created.length === 1 ? "" : "s"} generated as inactive` +
          (skippedCount > 0 ? ` · ${skippedCount} already existed` : ""),
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
