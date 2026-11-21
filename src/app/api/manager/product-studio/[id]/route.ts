import { NextRequest, NextResponse } from "next/server";
import { invalidInput, isDuplicateEntry } from "../../../../../utils/Api/apiResponse.util";
import type { RowDataPacket } from "mysql2";
import { auditLog } from "../../../../../services/AuditLog.service";
import { ImageKitService } from "../../../../../services/Imagekit.service";
import { generateULID } from "../../../../../utils/generateULID.util";
import { getCurrentDateTime } from "../../../../../utils/ValueFetcher/getDateTime.util";
import { requireManager } from "../../../../../utils/Auth/Auth.requireRole.util";
import { getPool } from "../../../../../lib/Database/main.db";
import {
  productBaseUpdateSchema,
  ProductDetailResponse,
} from "../../../../../utils/zod/product/manager.productDetail.zod";

/* -------------------------------------------------------------------------- */
/*  Row types — must extend RowDataPacket for mysql2's generic query()        */
/* -------------------------------------------------------------------------- */

interface ProductRow extends RowDataPacket {
  id: string;
  code: string;
  name: string;
  slug: string;
  brief_description: string | null;
  description: string | null;
  meta_title: string | null;
  meta_description: string | null;
  delivery_charges: number | string;
  processing_time: string | null;
  is_featured: number | boolean;
  main_showcase: number | boolean;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string | null;
}

interface IdRow extends RowDataPacket {
  id: string;
}

interface OwnedFileRow extends RowDataPacket {
  id: string;
  file_id: string | null;
}

interface TotalRow extends RowDataPacket {
  total: number | string;
}

interface CategoryRow extends RowDataPacket {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
}

interface LineItemRow extends RowDataPacket {
  id: string;
  value: string;
  sort_order: number | string;
}

interface OptionRow extends RowDataPacket {
  id: string;
  name: string;
  description: string | null;
}

interface OptionValueRow extends RowDataPacket {
  id: string;
  option_id: string;
  value: string;
}

interface VariantRow extends RowDataPacket {
  id: string;
  name: string | null;
  sku: string;
  price: number | string;
  compare_at_price: number | string | null;
  stock: number | string;
  status: "active" | "inactive";
  image_url: string | null;
}

interface VariantValueRow extends RowDataPacket {
  variant_id: string;
  option_name: string;
  value: string;
}

interface VariantStatsRow extends RowDataPacket {
  variant_count: number | string;
  total_stock: number | string;
  low_stock: number | string;
  out_of_stock: number | string;
  min_price: number | string | null;
  max_price: number | string | null;
}

interface OrderStatsRow extends RowDataPacket {
  orders: number | string;
  units_sold: number | string;
  revenue: number | string;
}

interface ReviewStatsRow extends RowDataPacket {
  total: number | string;
  average_rating: number | string | null;
}

interface ReviewRow extends RowDataPacket {
  id: string;
  reviewer_name: string;
  rating: number | string;
  title: string | null;
  comment: string | null;
  is_approved: number | boolean;
  variant_id: string | null;
  created_at: string;
}

interface MediaRow extends RowDataPacket {
  id: string;
  file_id: string | null;
  url: string;
  alt_text: string | null;
  variant_id: string;
  sort_order: number | string;
  created_at: string;
  source_image_id: string | null;
  owner_variant_name: string | null;
  owner_sku: string | null;
  linked_count: number | string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*  GET /api/manager/product-studio/[id]                                      */
/*  Everything the product overview page needs, in one round trip.            */
/* -------------------------------------------------------------------------- */

/**
 * Returns everything the product overview page needs for one product in a single round trip.
 *
 * @async
 * @function GET
 * @description Resolves the URL reference (internal id or readable code) to the product row,
 *              then reads the base copy, features, care instructions, categories, options with
 *              values, variants with their option values and first photo, all media rows (links
 *              resolve to their source file and owner variant), variant stock/price stats, order
 *              stats (cancelled orders excluded) and the newest reviews.
 *
 * @param {NextRequest} _req - The incoming HTTP request (unused)
 * @param {Object} context - Next.js route context
 * @param {Promise<{ id: string }>} context.params - Route parameters (`(await context.params).id`,
 *                                                  product id or product code, min 2 chars)
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - product: base copy plus `deliveryCharges`, `processingTime`, `isFeatured`, `mainShowcase`,
 *              `status`, `createdAt` and `updatedAt`
 *   - features, careInstructions: `{ id, value, sortOrder }` rows in sort order
 *   - categories: `{ id, name, slug, parentId }`, ordered by name
 *   - options: `{ id, name, description, values }`
 *   - variants: `{ id, name, sku, price, compareAtPrice, stock, status, optionValues, imageUrl }`
 *   - media: `{ id, url, fileId, altText, sortOrder, variantId, createdAt, isLinked,
 *              sourceImageId, ownerVariantName, ownerSku, linkedVariantCount }`
 *   - stats: `variantCount`, `totalStock`, `lowStock`, `outOfStock`, `minPrice`, `maxPrice`,
 *            `orders`, `unitsSold`, `revenue`, `reviewCount`, `averageRating`
 *   - reviews: the newest 20 `{ id, reviewerName, rating, title, comment, isApproved,
 *              createdAt, variantId }` rows
 *
 * @throws {400} "Invalid product reference" - Fewer than 2 characters in the segment
 * @throws {401} Unauthorized - No session
 * @throws {403} Forbidden - Account not active, no role, or role below manager
 * @throws {404} "Product not found" - Neither the id nor the code matches an active row
 * @throws {500} "Could not load the product" - Database failure
 *
 * @description Workflow:
 *   1. Initialize the manager guard (session, active status, role rank)
 *   2. Await `context.params` and reject a reference shorter than 2 chars
 *   3. Initialize the database pool and take a connection
 *   4. Resolve the reference to `products.id` by id or code, returning 404 when missing
 *   5. Load the base product row, returning 404 when missing
 *   6. Load `product_features` and `product_care_instructions` in sort order
 *   7. Load the product's categories
 *   8. Load `product_options` and their `product_option_values`
 *   9. Load `product_variants` with the first image per variant
 *   10. Load `variant_option_values` joined to option and value names
 *   11. Load media rows with owner variant and link count, filtered to this product
 *   12. Load variant stats (count, stock, low stock, out of stock, price range)
 *   13. Load order stats excluding cancelled orders
 *   14. Load approved review stats and the newest 20 reviews
 *   15. Group option values by option and variant values by variant
 *   16. Map everything into `ProductDetailResponse` and return 200
 *   17. Release the connection in `finally`
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireManager({
    label: "GET /api/manager/product-studio/[id]",
  });
  if (!guard.ok) return guard.response;

  const { id: productRef } = await params;
  if (!productRef || productRef.length < 2) {
    return NextResponse.json(
      { error: "Invalid product reference" },
      { status: 400 },
    );
  }

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    /* The url may carry the readable code or the internal id. Resolve it to
       the row id once, so every query below stays on the primary key. */
    const [refRows] = await conn.query<IdRow[]>(
      `SELECT id FROM products WHERE id = ? OR code = ? LIMIT 1`,
      [productRef, productRef],
    );
    const id = refRows[0]?.id;
    if (!id) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 },
      );
    }

    const [productRows] = await conn.query<ProductRow[]>(
      `SELECT id, code, name, slug,
              brief_description, description,
              meta_title, meta_description,
              delivery_charges, processing_time,
              is_featured, main_showcase, status,
              created_at, updated_at
         FROM products
        WHERE id = ?
        LIMIT 1`,
      [id],
    );
    const product = productRows[0];
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const [featureRows] = await conn.query<LineItemRow[]>(
      `SELECT id, feature AS value, sort_order
         FROM product_features
        WHERE product_id = ?
        ORDER BY sort_order ASC, created_at ASC`,
      [id],
    );

    const [careRows] = await conn.query<LineItemRow[]>(
      `SELECT id, instruction AS value, sort_order
         FROM product_care_instructions
        WHERE product_id = ?
        ORDER BY sort_order ASC, created_at ASC`,
      [id],
    );

    const [categoryRows] = await conn.query<CategoryRow[]>(
      `SELECT c.id, c.name, c.slug, c.parent_id
         FROM product_categories pc
         JOIN categories c ON c.id = pc.category_id
        WHERE pc.product_id = ?
        ORDER BY c.name ASC`,
      [id],
    );

    const [optionRows] = await conn.query<OptionRow[]>(
      `SELECT id, name, description
         FROM product_options
        WHERE product_id = ?
        ORDER BY created_at ASC, id ASC`,
      [id],
    );

    const [optionValueRows] = await conn.query<OptionValueRow[]>(
      `SELECT v.id, v.option_id, v.value
         FROM product_option_values v
         JOIN product_options o ON o.id = v.option_id
        WHERE o.product_id = ?
        ORDER BY v.created_at ASC, v.id ASC`,
      [id],
    );

    const [variantRows] = await conn.query<VariantRow[]>(
      `SELECT v.id, v.name, v.sku, v.price, v.compare_at_price,
              v.stock, v.status,
              (SELECT f.url
                 FROM imagekit_files f
                WHERE f.file_purpose = 'product_variant_image'
                  AND f.entity_type = 'product_variant'
                  AND f.entity_id = v.id
                ORDER BY f.sort_order ASC, f.created_at ASC
                LIMIT 1) AS image_url
         FROM product_variants v
        WHERE v.product_id = ?
        ORDER BY v.created_at ASC, v.id ASC`,
      [id],
    );

    const [variantValueRows] = await conn.query<VariantValueRow[]>(
      `SELECT vov.variant_id, po.name AS option_name, pov.value
         FROM variant_option_values vov
         JOIN product_option_values pov ON pov.id = vov.option_value_id
         JOIN product_options po       ON po.id = pov.option_id
        WHERE po.product_id = ?
        ORDER BY po.name ASC, pov.value ASC`,
      [id],
    );

    const [mediaRows] = await conn.query<MediaRow[]>(
      `SELECT f.id,
              COALESCE(src.file_id, f.file_id) AS file_id,
              f.url,
              f.alt_text,
              f.entity_id AS variant_id,
              f.sort_order,
              f.created_at,
              f.source_image_id,
              ov.name AS owner_variant_name,
              ov.sku  AS owner_sku,
              (SELECT COUNT(*) FROM imagekit_files l
                WHERE l.source_image_id = f.source_image_id) AS linked_count
         FROM imagekit_files f
         LEFT JOIN imagekit_files src ON src.id = f.source_image_id
         LEFT JOIN product_variants ov ON ov.id = src.entity_id
         JOIN product_variants v ON v.id = f.entity_id
        WHERE f.file_purpose = 'product_variant_image'
          AND f.entity_type = 'product_variant'
          AND v.product_id = ?
        ORDER BY f.sort_order ASC, f.created_at ASC`,
      [id],
    );

    const [variantStatsRows] = await conn.query<VariantStatsRow[]>(
      `SELECT COUNT(*)                                    AS variant_count,
              COALESCE(SUM(stock), 0)                     AS total_stock,
              COALESCE(SUM(stock BETWEEN 1 AND 5), 0)     AS low_stock,
              COALESCE(SUM(stock = 0), 0)                 AS out_of_stock,
              MIN(price)                                  AS min_price,
              MAX(price)                                  AS max_price
         FROM product_variants
        WHERE product_id = ?`,
      [id],
    );

    const [orderStatsRows] = await conn.query<OrderStatsRow[]>(
      `SELECT COUNT(DISTINCT oi.order_id)     AS orders,
              COALESCE(SUM(oi.quantity), 0)   AS units_sold,
              COALESCE(SUM(oi.total), 0)      AS revenue
         FROM order_items oi
         JOIN orders o           ON o.id = oi.order_id
         JOIN product_variants v ON v.id = oi.variant_id
        WHERE v.product_id = ?
          AND o.order_status <> 'cancelled'`,
      [id],
    );

    const [reviewStatsRows] = await conn.query<ReviewStatsRow[]>(
      `SELECT COUNT(*)          AS total,
              AVG(rating)       AS average_rating
         FROM product_reviews
        WHERE product_id = ? AND is_approved = 1`,
      [id],
    );

    const [reviewRows] = await conn.query<ReviewRow[]>(
      `SELECT id, reviewer_name, rating, title, comment,
              is_approved, variant_id, created_at
         FROM product_reviews
        WHERE product_id = ?
        ORDER BY created_at DESC
        LIMIT 20`,
      [id],
    );

    /* ---- group the joined rows ---- */

    const valuesByOption = new Map<string, { id: string; value: string }[]>();
    for (const row of optionValueRows) {
      const list = valuesByOption.get(row.option_id) ?? [];
      list.push({ id: row.id, value: row.value });
      valuesByOption.set(row.option_id, list);
    }

    const variantsById = new Map(variantRows.map((v) => [v.id, v]));
    const valuesByVariant = new Map<
      string,
      { option: string; value: string }[]
    >();
    for (const row of variantValueRows) {
      if (!variantsById.has(row.variant_id)) continue;
      const list = valuesByVariant.get(row.variant_id) ?? [];
      list.push({ option: row.option_name, value: row.value });
      valuesByVariant.set(row.variant_id, list);
    }

    const variantStats = variantStatsRows[0];
    const orderStats = orderStatsRows[0];
    const reviewStats = reviewStatsRows[0];

    const payload: ProductDetailResponse = {
      ok: true,
      product: {
        id: product.id,
        code: product.code,
        name: product.name,
        slug: product.slug,
        briefDescription: product.brief_description ?? "",
        description: product.description ?? "",
        metaTitle: product.meta_title ?? "",
        metaDescription: product.meta_description ?? "",
        deliveryCharges: Number(product.delivery_charges ?? 0),
        processingTime: product.processing_time ?? "",
        isFeatured: Boolean(product.is_featured),
        mainShowcase: Boolean(product.main_showcase),
        status: product.status,
        createdAt: product.created_at,
        updatedAt: product.updated_at,
      },
      features: featureRows.map((row) => ({
        id: row.id,
        value: row.value,
        sortOrder: Number(row.sort_order ?? 0),
      })),
      careInstructions: careRows.map((row) => ({
        id: row.id,
        value: row.value,
        sortOrder: Number(row.sort_order ?? 0),
      })),
      categories: categoryRows.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        parentId: c.parent_id,
      })),
      options: optionRows.map((o) => ({
        id: o.id,
        name: o.name,
        description: o.description ?? "",
        values: valuesByOption.get(o.id) ?? [],
      })),
      variants: variantRows.map((v) => ({
        id: v.id,
        name: v.name ?? "",
        sku: v.sku,
        price: Number(v.price),
        compareAtPrice:
          v.compare_at_price === null ? null : Number(v.compare_at_price),
        stock: Number(v.stock ?? 0),
        status: v.status,
        optionValues: valuesByVariant.get(v.id) ?? [],
        imageUrl: v.image_url ?? null,
      })),
      media: mediaRows.map((m) => ({
        id: m.id,
        url: m.url,
        fileId: m.file_id ?? "",
        altText: m.alt_text ?? "",
        sortOrder: Number(m.sort_order ?? 0),
        variantId: m.variant_id,
        createdAt: m.created_at,
        isLinked: m.source_image_id !== null,
        sourceImageId: m.source_image_id,
        ownerVariantName: m.owner_variant_name,
        ownerSku: m.owner_sku,
        linkedVariantCount: Number(m.linked_count ?? 0),
      })),
      stats: {
        variantCount: Number(variantStats?.variant_count ?? 0),
        totalStock: Number(variantStats?.total_stock ?? 0),
        lowStock: Number(variantStats?.low_stock ?? 0),
        outOfStock: Number(variantStats?.out_of_stock ?? 0),
        minPrice:
          variantStats?.min_price === null ||
          variantStats?.min_price === undefined
            ? null
            : Number(variantStats.min_price),
        maxPrice:
          variantStats?.max_price === null ||
          variantStats?.max_price === undefined
            ? null
            : Number(variantStats.max_price),
        orders: Number(orderStats?.orders ?? 0),
        unitsSold: Number(orderStats?.units_sold ?? 0),
        revenue: Number(orderStats?.revenue ?? 0),
        reviewCount: Number(reviewStats?.total ?? 0),
        averageRating:
          reviewStats?.average_rating === null ||
          reviewStats?.average_rating === undefined
            ? null
            : Number(reviewStats.average_rating),
      },
      reviews: reviewRows.map((r) => ({
        id: r.id,
        reviewerName: r.reviewer_name,
        rating: Number(r.rating),
        title: r.title ?? "",
        comment: r.comment ?? "",
        isApproved: Boolean(r.is_approved),
        createdAt: r.created_at,
        variantId: r.variant_id,
      })),
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error("[PRODUCT STUDIO - PRODUCT - GET]", err);
    return NextResponse.json(
      { error: "Could not load the product" },
      { status: 500 },
    );
  } finally {
    conn.release();
  }
}

/* -------------------------------------------------------------------------- */
/*  PUT /api/manager/product-studio/[id]                                      */
/*  Edit the base product. `slug` stays stable; `code` may be changed but      */
/*  must be unique. Categories are replaced only when `categoryIds` is sent.   */
/* -------------------------------------------------------------------------- */

/**
 * Edits a base product, replacing its category, feature and care lists only when sent.
 *
 * @async
 * @function PUT
 * @description Validates with `productBaseUpdateSchema` and resolves the URL reference to the
 *              product. The slug is never touched so links stay stable; `code` may be changed but
 *              must be free. Sending `categoryIds` replaces the whole set (at least one, all must
 *              exist), `features` and `careInstructions` replace their lists entirely. Switching
 *              `active` → `inactive` is refused with 409 when any variant appears in
 *              `order_items`; otherwise every ImageKit file owned by the product's variants is
 *              deleted first, then the link rows, media rows and variants are disabled inside a
 *              transaction.
 *
 * @param {NextRequest} req - The incoming HTTP request with a JSON body
 * @param {Object} context - Next.js route context
 * @param {Promise<{ id: string }>} context.params - Route parameters (`(await context.params).id`,
 *                                                  product id or product code, min 2 chars)
 *
 * @body {string} name - Product name (2-255 chars)
 * @body {string} [code] - Product code (2-50 chars, uppercase letters, digits, dash, underscore);
 *                         omitted leaves the stored code untouched
 * @body {string} [briefDescription] - Short description (max 500 chars, default: "")
 * @body {string} [description] - Full description (max 20000 chars, default: "")
 * @body {string} [metaTitle] - Meta title (max 255 chars, default: "")
 * @body {string} [metaDescription] - Meta description (max 500 chars, default: "")
 * @body {number} [deliveryCharges] - Delivery charge 0-100000 (default: 0)
 * @body {string} [processingTime] - Processing time text (max 100 chars, default: "")
 * @body {boolean} [isFeatured] - Featured flag (default: false)
 * @body {boolean} [mainShowcase] - Main showcase flag (default: false)
 * @body {string} [status] - `active` or `inactive` (default: "active")
 * @body {string[]} [categoryIds] - Full replacement of the category set (10-40 chars each)
 * @body {string[]} [features] - Full replacement of the feature bullets (1-255 chars each)
 * @body {string[]} [careInstructions] - Full replacement of the care list (1-255 chars each)
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - message: "Product updated"
 *   - product: `id`, `code`, `name`, `status`, `isFeatured`, `mainShowcase`
 *
 * @throws {400} Validation failed - Schema errors, empty or unknown category ids, a code taken
 *               by another product
 * @throws {401} Unauthorized - No session, role too low, or session without a user id
 * @throws {403} Forbidden - Account not active or no role assigned
 * @throws {404} "Product not found"
 * @throws {409} Disabling is refused while variants appear in order items
 * @throws {500} "Could not update the product" - Database failure
 * @throws {502} ImageKit could not delete a variant image, so nothing was changed
 *
 * @description Workflow:
 *   1. Initialize the manager guard and read the manager id, returning 401 when missing
 *   2. Await `context.params` and reject a reference shorter than 2 chars
 *   3. Parse the JSON body and validate it with `productBaseUpdateSchema`
 *   4. Initialize the database pool and take a connection
 *   5. Load the product by id or code, returning 404 when missing
 *   6. When `categoryIds` is sent: de-duplicate, reject an empty list, verify all exist
 *   7. When `code` is sent: reject one already used by another product
 *   8. Detect an active → inactive transition
 *   9. When disabling: count `order_items` for its variants and return 409 when non-zero
 *   10. When disabling: collect its variants and their original (non-link) image rows
 *   11. Delete each ImageKit file first, returning 502 if any deletion fails
 *   12. Begin a transaction
 *   13. When disabling: delete link rows, count and delete the media rows, and set every
 *       variant of the product to `inactive`
 *   14. Update `products` (code via `COALESCE`, copy, delivery, processing time, flags, status,
 *       `updated_by`, `updated_at`)
 *   15. Replace `product_categories` when `categoryIds` was sent
 *   16. Replace `product_features` (new `feat` ULIDs, index as sort order) when sent
 *   17. Replace `product_care_instructions` (new `care` ULIDs) when sent
 *   18. Commit the transaction
 *   19. Write an UPDATE / PRODUCT audit entry noting replaced lists and any disabled variants,
 *       swallowing audit errors
 *   20. Return 200 response with the updated identity
 *   21. Roll back on error; map `ER_DUP_ENTRY` to a code field error
 *   22. Release the connection in `finally`
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireManager({
    label: "PUT /api/manager/product-studio/[id]",
  });
  if (!guard.ok) return guard.response;

  const managerId = guard.session.user.id;
  if (!managerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: productRef } = await params;
  if (!productRef || productRef.length < 2) {
    return NextResponse.json(
      { error: "Invalid product reference" },
      { status: 400 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = productBaseUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return invalidInput(parsed.error.flatten().fieldErrors);
  }
  const data = parsed.data;

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    /* Accept either the readable code or the internal id in the url. */
    const [existingRows] = await conn.query<ProductRow[]>(
      `SELECT id, code, name, slug, status
         FROM products
        WHERE id = ? OR code = ?
        LIMIT 1`,
      [productRef, productRef],
    );
    if (!existingRows[0]) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    const id = existingRows[0].id;

    let categoryIds: string[] | null = null;
    if (data.categoryIds) {
      categoryIds = [...new Set(data.categoryIds)];
      if (categoryIds.length === 0) {
        return invalidInput({
          categoryIds: ["Pick at least one category"],
        });
      }
      const [rows] = await conn.query<CategoryRow[]>(
        `SELECT id FROM categories WHERE id IN (?)`,
        [categoryIds],
      );
      if (rows.length !== categoryIds.length) {
        return invalidInput({
          categoryIds: ["One or more categories no longer exist"],
        });
      }
    }

    if (data.code) {
      const [taken] = await conn.query<IdRow[]>(
        `SELECT id FROM products WHERE code = ? AND id <> ? LIMIT 1`,
        [data.code, id],
      );
      if (taken.length > 0) {
        return invalidInput({
          code: ["Another product already uses this code"],
        });
      }
    }

    /* Disabling the base product hides everything under it: every variant is
       disabled and all of their photos are removed to free up space. It is
       refused as soon as any variant of this product sits in an order. */
    const disabling =
      existingRows[0].status === "active" && data.status === "inactive";

    const now = getCurrentDateTime();
    let ownedFiles: OwnedFileRow[] = [];
    let variantIds: string[] = [];
    let removedImages = 0;

    if (disabling) {
      const [orderRows] = await conn.query<TotalRow[]>(
        `SELECT COUNT(*) AS total
           FROM order_items oi
           JOIN product_variants v ON v.id = oi.variant_id
          WHERE v.product_id = ?`,
        [id],
      );
      const orderCount = Number(orderRows[0]?.total ?? 0);
      if (orderCount > 0) {
        return NextResponse.json(
          {
            error: `This product's variants appear in ${orderCount} order item${orderCount === 1 ? "" : "s"} and cannot be disabled.`,
          },
          { status: 409 },
        );
      }

      const [variantRows] = await conn.query<IdRow[]>(
        `SELECT id FROM product_variants WHERE product_id = ?`,
        [id],
      );
      variantIds = variantRows.map((row) => row.id);

      if (variantIds.length > 0) {
        const [fileRows] = await conn.query<OwnedFileRow[]>(
          `SELECT id, file_id
             FROM imagekit_files
            WHERE entity_type = 'product_variant'
              AND file_purpose = 'product_variant_image'
              AND entity_id IN (?)
              AND source_image_id IS NULL`,
          [variantIds],
        );
        ownedFiles = fileRows;

        /* ImageKit first — a failed delete must never leave orphan objects
           behind. A 404 counts as success (the file was already gone). */
        for (const file of ownedFiles) {
          if (!file.file_id) continue;
          const removed = await ImageKitService.deleteFileStrict(file.file_id);
          if (!removed) {
            return NextResponse.json(
              {
                error:
                  "Could not delete this product's variant image files from ImageKit. Nothing was changed — try again.",
              },
              { status: 502 },
            );
          }
        }
      }
    }

    await conn.beginTransaction();

    if (disabling && variantIds.length > 0) {
      const originalImageIds = ownedFiles.map((file) => file.id);
      if (originalImageIds.length > 0) {
        await conn.query(
          `DELETE FROM imagekit_files WHERE source_image_id IN (?)`,
          [originalImageIds],
        );
      }

      const [mediaCountRows] = await conn.query<TotalRow[]>(
        `SELECT COUNT(*) AS total
           FROM imagekit_files
          WHERE entity_type = 'product_variant'
            AND file_purpose = 'product_variant_image'
            AND entity_id IN (?)`,
        [variantIds],
      );
      removedImages = Number(mediaCountRows[0]?.total ?? 0);

      await conn.query(
        `DELETE FROM imagekit_files
          WHERE entity_type = 'product_variant'
            AND file_purpose = 'product_variant_image'
            AND entity_id IN (?)`,
        [variantIds],
      );

      await conn.query(
        `UPDATE product_variants
            SET status = 'inactive', updated_by = ?, updated_at = ?
          WHERE product_id = ?`,
        [managerId, now, id],
      );
    }

    await conn.query(
      `UPDATE products
          SET code = COALESCE(?, code),
              name = ?,
              brief_description = ?,
              description = ?,
              meta_title = ?,
              meta_description = ?,
              delivery_charges = ?,
              processing_time = ?,
              is_featured = ?,
              main_showcase = ?,
              status = ?,
              updated_by = ?,
              updated_at = ?
        WHERE id = ?`,
      [
        data.code ?? null,
        data.name,
        data.briefDescription || null,
        data.description || null,
        data.metaTitle || null,
        data.metaDescription || null,
        data.deliveryCharges,
        data.processingTime || null,
        data.isFeatured ? 1 : 0,
        data.mainShowcase ? 1 : 0,
        data.status,
        managerId,
        now,
        id,
      ],
    );

    if (categoryIds) {
      await conn.query(`DELETE FROM product_categories WHERE product_id = ?`, [
        id,
      ]);
      await conn.query(
        `INSERT INTO product_categories (product_id, category_id) VALUES ?`,
        [categoryIds.map((categoryId) => [id, categoryId])],
      );
    }

    if (data.features) {
      await conn.query(`DELETE FROM product_features WHERE product_id = ?`, [
        id,
      ]);
      if (data.features.length > 0) {
        await conn.query(
          `INSERT INTO product_features
             (id, product_id, feature, sort_order, created_by, created_at)
           VALUES ?`,
          [
            data.features.map((feature, index) => [
              generateULID("feat"),
              id,
              feature,
              index,
              managerId,
              now,
            ]),
          ],
        );
      }
    }

    if (data.careInstructions) {
      await conn.query(
        `DELETE FROM product_care_instructions WHERE product_id = ?`,
        [id],
      );
      if (data.careInstructions.length > 0) {
        await conn.query(
          `INSERT INTO product_care_instructions
             (id, product_id, instruction, sort_order, created_by, created_at)
           VALUES ?`,
          [
            data.careInstructions.map((instruction, index) => [
              generateULID("care"),
              id,
              instruction,
              index,
              managerId,
              now,
            ]),
          ],
        );
      }
    }

    await conn.commit();

    try {
      await auditLog.log(pool, {
        userId: managerId,
        action: "UPDATE",
        entityType: "PRODUCT",
        entityId: id,
        description: `Base product updated. [id=${id}, code=${data.code ?? existingRows[0].code}, name=${data.name}, status=${data.status}, categories=${categoryIds ? categoryIds.length : "unchanged"}, features=${data.features ? data.features.length : "unchanged"}, care=${data.careInstructions ? data.careInstructions.length : "unchanged"}${disabling ? `, disabledVariants=${variantIds.length}, removedImages=${removedImages}` : ""}]`,
      });
    } catch {
      /* audit must never break the response */
    }

    return NextResponse.json({
      ok: true,
      message: "Product updated",
      product: {
        id,
        code: data.code ?? existingRows[0].code,
        name: data.name,
        status: data.status,
        isFeatured: data.isFeatured,
        mainShowcase: data.mainShowcase,
      },
    });
  } catch (err) {
    await conn.rollback().catch(() => {});
    if (isDuplicateEntry(err)) {
      return invalidInput({
        code: ["Another product already uses this code"],
      });
    }
    console.error("[PRODUCT STUDIO - PRODUCT - PUT]", err);
    return NextResponse.json(
      { error: "Could not update the product" },
      { status: 500 },
    );
  } finally {
    conn.release();
  }
}
