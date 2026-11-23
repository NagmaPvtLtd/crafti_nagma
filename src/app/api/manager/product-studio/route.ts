import { NextRequest, NextResponse } from "next/server";
import {
  invalidInput,
  isDuplicateEntry,
} from "../../../../utils/Api/apiResponse.util";
import type { RowDataPacket } from "mysql2";

import { requireManager } from "../../../../utils/Auth/Auth.requireRole.util";
import { generateULID } from "../../../../utils/generateULID.util";
import { getPool } from "../../../../lib/Database/main.db";
import { getCurrentDateTime } from "../../../../utils/ValueFetcher/getDateTime.util";
import { auditLog } from "../../../../services/AuditLog.service";
import { baseProductCreateSchema } from "../../../../utils/zod/product/manager.product.zod";
import { buildUniqueSlug, slugify } from "../../../../utils/Slug/slug.util";
import { buildProductCode } from "../../../../utils/Formator/productIdentity.util";

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
/*  GET /api/manager/product-studio                                            */
/*  Product listing is not built yet — it stays a 503 until it is.            */
/* -------------------------------------------------------------------------- */

/**
 * Placeholder for the product-studio root listing.
 *
 * @async
 * @function GET
 * @description The listing is not built yet, so this handler always answers 503. It performs no
 *              auth check and reads nothing; `/api/manager` is already gated by `src/proxy.ts`.
 *              The real catalogue lives at `/api/manager/product-studio/products`.
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - error: "WORK IN PROGRESS"
 *
 * @throws {503} Always - the listing is not implemented
 *
 * @description Workflow:
 *   1. Return 503 response with "WORK IN PROGRESS"
 */
export async function GET() {
  return NextResponse.json({ error: "WORK IN PROGRESS" }, { status: 503 });
}

/* -------------------------------------------------------------------------- */
/*  POST /api/manager/product-studio                                          */
/*  Create a base product: code + slug generated, categories and the option   */
/*  pool attached. A base product is never purchasable — variants are.        */
/* -------------------------------------------------------------------------- */

/**
 * Creates a base product with generated code and slug, its categories and its option pool.
 *
 * @async
 * @function POST
 * @description Validates with `baseProductCreateSchema`, which requires at least one category
 *              and at least one option with at least one value. Duplicate categories, options
 *              and values are merged before writing. Inside a transaction it verifies that every
 *              category, option and option value still exists (and that each value belongs to its
 *              option), builds a unique slug from the name and a product code from
 *              `buildProductCode`, then inserts the `products` row, the `product_categories`
 *              rows, and one `product_options` row plus `product_option_values` rows per option.
 *              A base product is never purchasable — only its variants are.
 *
 * @param {NextRequest} req - The incoming HTTP request with a JSON body
 * @body {string} name - Product name (2-255 chars)
 * @body {string} [briefDescription] - Short description (max 500 chars, default: "")
 * @body {string} [description] - Full description (max 20000 chars, default: "")
 * @body {string} [metaTitle] - Meta title (max 255 chars, default: "")
 * @body {string} [metaDescription] - Meta description (max 500 chars, default: "")
 * @body {number} [deliveryCharges] - Delivery charge 0-100000 (default: 0)
 * @body {boolean} [isFeatured] - Featured flag (default: false)
 * @body {boolean} [mainShowcase] - Main showcase flag (default: false)
 * @body {string} [status] - `active` or `inactive` (default: "active")
 * @body {string[]} categoryIds - Category ids (10-40 chars each, at least one)
 * @body {Object[]} options - Selected global options, at least one
 * @body {string} options[].optionId - Global option id (10-40 chars)
 * @body {string[]} options[].valueIds - Selected value ids for that option (at least one,
 *                                      10-40 chars each)
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - message: "Base product created"
 *   - product: `id`, `code`, `slug`, `name`, `status`, `categoryCount`, `optionCount`
 *
 * @throws {400} Validation failed - Schema errors, missing categories/options/values, a value
 *               that does not belong to its option
 * @throws {401} Unauthorized - No session, role too low, or session without a user id
 * @throws {403} Forbidden - Account not active or no role assigned
 * @throws {409} The generated product code is already taken, or the name clashes
 * @throws {500} `server_error` - Database failure while validating or inserting
 *
 * @description Workflow:
 *   1. Initialize the manager guard and read the manager id, returning 401 when missing
 *   2. Parse the JSON body and validate it with `baseProductCreateSchema`
 *   3. De-duplicate `categoryIds`
 *   4. Merge repeated options and de-duplicate each option's `valueIds`
 *   5. Initialize the database pool, take a connection and begin a transaction
 *   6. Verify every category id still exists, else roll back with a field error
 *   7. Verify every option id still exists, else roll back with a field error
 *   8. Load every selected value and confirm each belongs to its option
 *   9. Generate the `prod` ULID, current timestamp and a unique slug
 *   10. Build the product code with `buildProductCode` and reject a taken code with 409
 *   11. Insert the base row into `products` (counters start at 0)
 *   12. Insert the `product_categories` rows
 *   13. Per option: insert a `product_options` row (`po` ULID, name and description copied
 *       from the global option) and its `product_option_values` rows (`pov` ULIDs)
 *   14. Commit the transaction
 *   15. Write a CREATE / PRODUCT audit entry, swallowing audit errors
 *   16. Return 201 response with the product identity and counts
 *   17. Roll back on error; map `ER_DUP_ENTRY` to a 409 name error, else 500
 *   18. Release the connection in `finally`
 */
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
    optionMap.set(option.optionId, [
      ...new Set([...existing, ...option.valueIds]),
    ]);
  }
  const optionRequests = [...optionMap.entries()].map(
    ([optionId, valueIds]) => ({
      optionId,
      valueIds,
    }),
  );
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
    const allValueIds = [...new Set(optionRequests.flatMap((o) => o.valueIds))];
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

    /* PREFIX-P{YY}00-{last 4 of the id} — see productIdentity.util.ts. */
    const code = buildProductCode(data.name, productId);
    const [codeTaken] = await conn.query<IdRow[]>(
      `SELECT id FROM products WHERE code = ? LIMIT 1`,
      [code],
    );
    if (codeTaken.length > 0) {
      await conn.rollback();
      return NextResponse.json(
        { error: "That product code is already taken. Please try again." },
        { status: 409 },
      );
    }

    /* ---- product ---- */
    await conn.query(
      `INSERT INTO products
         (id, code, name, slug,
          brief_description, description,
          meta_title, meta_description,
          delivery_charges, processing_time,
          length, width, height, dimension_unit,
          is_featured, main_showcase, orders_count, status,
          created_by, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, 0, ?, ?, NULL, ?, NULL)`,
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
        data.length,
        data.width,
        data.height,
        data.dimensionUnit,
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
          details: {
            name: ["A product with this name already exists — try again"],
          },
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
