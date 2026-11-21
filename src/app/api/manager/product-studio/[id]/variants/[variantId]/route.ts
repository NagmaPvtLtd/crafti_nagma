import { NextRequest, NextResponse } from "next/server";
import { invalidInput, isDuplicateEntry } from "../../../../../../../utils/Api/apiResponse.util";

import { resolveProductId, resolveVariantId } from "../../../../../../../utils/ProductStudio/productStudio.lookup.util";
import type { RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import {
  VARIANT_ACTIVATION_RULES,
  VariantDetailResponse,
  variantUpdateSchema,
} from "../../../../../../../utils/zod/product/manager.productDetail.zod";
import { requireManager } from "../../../../../../../utils/Auth/Auth.requireRole.util";
import { getPool } from "../../../../../../../lib/Database/main.db";
import { getCurrentDateTime } from "../../../../../../../utils/ValueFetcher/getDateTime.util";
import { auditLog } from "../../../../../../../services/AuditLog.service";
import { ImageKitService } from "../../../../../../../services/Imagekit.service";

/* -------------------------------------------------------------------------- */
/*  Row types — must extend RowDataPacket for mysql2's generic query()        */
/* -------------------------------------------------------------------------- */

interface IdRow extends RowDataPacket {
  id: string;
}

interface VariantRow extends RowDataPacket {
  id: string;
  product_id: string;
  product_name: string;
  product_code: string;
  product_brief_description: string | null;
  product_description: string | null;
  name: string | null;
  brief_description: string | null;
  description: string | null;
  sku: string;
  price: number | string;
  compare_at_price: number | string | null;
  stock: number | string;
  weight: number | string | null;
  status: "active" | "inactive";
  is_featured: number | boolean;
  main_showcase: number | boolean;
  orders_count: number | string;
  created_at: string;
  updated_at: string | null;
}

interface OptionValueRow extends RowDataPacket {
  option_name: string;
  value: string;
}

interface MediaRow extends RowDataPacket {
  id: string;
  file_id: string | null;
  url: string;
  alt_text: string | null;
  sort_order: number | string;
  created_at: string;
  source_image_id: string | null;
  owner_variant_name: string | null;
  owner_sku: string | null;
  linked_count: number | string;
}

interface OrderStatsRow extends RowDataPacket {
  orders: number | string;
  units_sold: number | string;
  revenue: number | string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Loads one variant with its product context
 *
 * @async
 * @function loadVariant
 * @description Selects the variant joined to its product, scoped to both ids so a variant can
 *              never be read through the wrong product.
 *
 * @param {PoolConnection} conn - Open database connection
 * @param {string} productId - Resolved product id
 * @param {string} variantId - Resolved variant id
 *
 * @returns {Promise<VariantRow | undefined>} The joined row, or `undefined` when not found
 */
async function loadVariant(
  conn: PoolConnection,
  productId: string,
  variantId: string,
) {
  const [rows] = await conn.query<VariantRow[]>(
    `SELECT v.id, v.product_id,
            p.name AS product_name, p.code AS product_code,
            p.brief_description AS product_brief_description,
            p.description AS product_description,
            v.name, v.brief_description, v.description, v.sku,
            v.price, v.compare_at_price, v.stock, v.weight,
            v.status, v.is_featured, v.main_showcase, v.orders_count,
            v.created_at, v.updated_at
       FROM product_variants v
       JOIN products p ON p.id = v.product_id
      WHERE v.id = ? AND v.product_id = ?
      LIMIT 1`,
    [variantId, productId],
  );
  return rows[0];
}

/**
 * Loads a variant's photos with link metadata
 *
 * @async
 * @function loadMedia
 * @description Selects `imagekit_files` rows for the variant in display order, resolving a link
 *              row to its source file id and to the variant that originally uploaded it.
 *
 * @param {PoolConnection} conn - Open database connection
 * @param {string} productId - Resolved product id (kept for symmetry with the other loaders)
 * @param {string} variantId - Resolved variant id
 *
 * @returns {Promise<VariantDetailResponse["media"]>} Media items with link metadata
 */
async function loadMedia(
  conn: PoolConnection,
  productId: string,
  variantId: string,
): Promise<VariantDetailResponse["media"]> {
  const [rows] = await conn.query<MediaRow[]>(
    `SELECT f.id,
              COALESCE(src.file_id, f.file_id) AS file_id,
              f.url,
              f.alt_text,
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
      WHERE f.file_purpose = 'product_variant_image'
        AND f.entity_type = 'product_variant'
        AND f.entity_id = ?
      ORDER BY f.sort_order ASC, f.created_at ASC, f.id ASC`,
    [variantId],
  );

  return rows.map((m) => ({
    id: m.id,
    url: m.url,
    fileId: m.file_id ?? "",
    altText: m.alt_text ?? "",
    sortOrder: Number(m.sort_order ?? 0),
    variantId,
    createdAt: m.created_at ?? null,
    isLinked: m.source_image_id !== null,
    sourceImageId: m.source_image_id,
    ownerVariantName: m.owner_variant_name,
    ownerSku: m.owner_sku,
    linkedVariantCount: Number(m.linked_count ?? 0),
  }));
}

interface VariantStatusRow extends RowDataPacket {
  status: "active" | "inactive";
}

/**
 * Variants can share photos through shallow links. Removing one variant's own
 * uploads delinks every variant that borrowed them, so a sibling can suddenly
 * be left with no photos at all — which the storefront cannot present. Those
 * emptied variants are disabled here, in the same transaction.
 *
 * Consumes `originalImageIds` (deleting the link rows) and returns the ids of
 * the variants that were hidden.
 */
async function unlinkAndHideEmptyVariants(
  conn: PoolConnection,
  originalImageIds: string[],
  excludedVariantId: string,
  managerId: string,
  now: string,
): Promise<string[]> {
  if (originalImageIds.length === 0) return [];

  /* Who is borrowing these photos right now? Collected before the links go. */
  const [linkedRows] = await conn.query<IdRow[]>(
    `SELECT DISTINCT entity_id AS id
       FROM imagekit_files
      WHERE source_image_id IN (?)
        AND entity_type = 'product_variant'
        AND file_purpose = 'product_variant_image'
        AND entity_id <> ?`,
    [originalImageIds, excludedVariantId],
  );

  await conn.query(
    `DELETE FROM imagekit_files WHERE source_image_id IN (?)`,
    [originalImageIds],
  );

  const hidden: string[] = [];
  for (const linked of linkedRows) {
    const [mediaRows] = await conn.query<OrderCountRow[]>(
      `SELECT COUNT(*) AS total
         FROM imagekit_files
        WHERE entity_type = 'product_variant'
          AND file_purpose = 'product_variant_image'
          AND entity_id = ?`,
      [linked.id],
    );
    if (Number(mediaRows[0]?.total ?? 0) > 0) continue;

    const [statusRows] = await conn.query<VariantStatusRow[]>(
      `SELECT status FROM product_variants WHERE id = ? LIMIT 1`,
      [linked.id],
    );
    if (!statusRows[0] || statusRows[0].status === "inactive") continue;

    await conn.query(
      `UPDATE product_variants
          SET status = 'inactive', updated_by = ?, updated_at = ?
        WHERE id = ?`,
      [managerId, now, linked.id],
    );
    hidden.push(linked.id);
  }

  return hidden;
}

/* -------------------------------------------------------------------------- */
/*  GET /api/manager/product-studio/[id]/variants/[variantId]                 */
/* -------------------------------------------------------------------------- */

/**
 * Returns one purchasable variant with its option values, photos, order stats and base copy.
 *
 * @async
 * @function GET
 * @description Resolves the product (id or code) then the variant (id or SKU) inside it, and
 *              returns the variant copy, price, stock, weight, badges, option-value pairs, media
 *              rows and order stats (cancelled orders excluded). `baseProduct` carries the copy
 *              the sync buttons pull from.
 *
 * @param {NextRequest} _req - The incoming HTTP request (unused)
 * @param {Object} context - Next.js route context
 * @param {Promise<{ id: string, variantId: string }>} context.params - Route parameters
 *        (`(await context.params).id` and `.variantId`, both min 2 chars)
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - variant: `id`, `productId`, `productName`, `productCode`, `name`, `briefDescription`,
 *              `description`, `sku`, `price`, `compareAtPrice`, `stock`, `weight`, `status`,
 *              `isFeatured`, `mainShowcase`, `ordersCount`, `orderStats`, `createdAt`, `updatedAt`
 *   - optionValues: `{ option, value }` pairs
 *   - media: media items with `isLinked`, `sourceImageId`, `ownerVariantName`, `ownerSku` and
 *            `linkedVariantCount`
 *   - baseProduct: `name`, `briefDescription`, `description`
 *
 * @throws {400} "Invalid product reference" or "Invalid variant reference"
 * @throws {401} Unauthorized - No session
 * @throws {403} Forbidden - Account not active, no role, or role below manager
 * @throws {404} "Product not found" or "Variant not found"
 * @throws {500} "Could not load the variant" - Database failure
 *
 * @description Workflow:
 *   1. Initialize the manager guard (session, active status, role rank)
 *   2. Await `context.params` and validate both references (min 2 chars)
 *   3. Initialize the database pool and take a connection
 *   4. Resolve the product id with `resolveProductId`, returning 404 when missing
 *   5. Resolve the variant id with `resolveVariantId`, returning 404 when missing
 *   6. Load the variant with `loadVariant`, returning 404 when missing
 *   7. Load the variant's option-value pairs ordered by option then value
 *   8. Load order stats across non-cancelled orders
 *   9. Load media with `loadMedia`
 *   10. Map the row into `VariantDetailResponse` and return 200
 *   11. Release the connection in `finally`
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> },
) {
  const guard = await requireManager({
    label: "GET /api/manager/product-studio/[id]/variants/[variantId]",
  });
  if (!guard.ok) return guard.response;

  const { id: productRef, variantId: variantRef } = await params;
  if (!productRef || productRef.length < 2) {
    return NextResponse.json(
      { error: "Invalid product reference" },
      { status: 400 },
    );
  }
  if (!variantRef || variantRef.length < 2) {
    return NextResponse.json(
      { error: "Invalid variant reference" },
      { status: 400 },
    );
  }

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const productId = await resolveProductId(conn, productRef);
    if (!productId) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    const variantId = await resolveVariantId(conn, productId, variantRef);
    if (!variantId) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    const variant = await loadVariant(conn, productId, variantId);
    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    const [optionValueRows] = await conn.query<OptionValueRow[]>(
      `SELECT po.name AS option_name, pov.value
         FROM variant_option_values vov
         JOIN product_option_values pov ON pov.id = vov.option_value_id
         JOIN product_options po       ON po.id = pov.option_id
        WHERE vov.variant_id = ?
        ORDER BY po.name ASC, pov.value ASC`,
      [variantId],
    );

    const [orderStatsRows] = await conn.query<OrderStatsRow[]>(
      `SELECT COUNT(DISTINCT oi.order_id)   AS orders,
              COALESCE(SUM(oi.quantity), 0) AS units_sold,
              COALESCE(SUM(oi.total), 0)    AS revenue
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
        WHERE oi.variant_id = ?
          AND o.order_status <> 'cancelled'`,
      [variantId],
    );

    const media = await loadMedia(conn, productId, variantId);
    const orderStats = orderStatsRows[0];

    const payload: VariantDetailResponse = {
      ok: true,
      variant: {
        id: variant.id,
        productId: variant.product_id,
        productName: variant.product_name,
        productCode: variant.product_code,
        name: variant.name ?? "",
        briefDescription: variant.brief_description ?? "",
        description: variant.description ?? "",
        sku: variant.sku,
        price: Number(variant.price),
        compareAtPrice:
          variant.compare_at_price === null
            ? null
            : Number(variant.compare_at_price),
        stock: Number(variant.stock ?? 0),
        weight: variant.weight === null ? null : Number(variant.weight),
        status: variant.status,
        isFeatured: Boolean(variant.is_featured),
        mainShowcase: Boolean(variant.main_showcase),
        ordersCount: Number(variant.orders_count ?? 0),
        orderStats: {
          orders: Number(orderStats?.orders ?? 0),
          unitsSold: Number(orderStats?.units_sold ?? 0),
          revenue: Number(orderStats?.revenue ?? 0),
        },
        createdAt: variant.created_at,
        updatedAt: variant.updated_at,
      },
      optionValues: optionValueRows.map((row) => ({
        option: row.option_name,
        value: row.value,
      })),
      media,
      baseProduct: {
        name: variant.product_name,
        briefDescription: variant.product_brief_description ?? "",
        description: variant.product_description ?? "",
      },
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error("[PRODUCT STUDIO - VARIANT - GET]", err);
    return NextResponse.json(
      { error: "Could not load the variant" },
      { status: 500 },
    );
  } finally {
    conn.release();
  }
}

/* -------------------------------------------------------------------------- */
/*  PUT /api/manager/product-studio/[id]/variants/[variantId]                 */
/*  Edit the purchasable variant — price, stock, copy, badges.                */
/* -------------------------------------------------------------------------- */

/**
 * Edits a purchasable variant: copy, price, stock, weight, status and badges.
 *
 * @async
 * @function PUT
 * @description Validates with `variantUpdateSchema`. Activating an inactive variant is gated on
 *              `VARIANT_ACTIVATION_RULES` (name ≥ 3, short description ≥ 10, description ≥ 20
 *              characters) and on at least one photo, uploaded or linked. Disabling is refused
 *              with 409 once the variant appears in `order_items`; otherwise its ImageKit files
 *              are deleted first, borrowers of those files are unlinked, empty sibling variants
 *              are disabled, and the variant's own media rows are removed in the transaction.
 *
 * @param {NextRequest} req - The incoming HTTP request with a JSON body
 * @param {Object} context - Next.js route context
 * @param {Promise<{ id: string, variantId: string }>} context.params - Route parameters
 *        (`(await context.params).id` and `.variantId`, both min 2 chars)
 *
 * @body {string} [name] - Variant name (max 150 chars, default: "")
 * @body {string} [briefDescription] - Short description (max 500 chars, default: "")
 * @body {string} [description] - Description (max 500 chars, default: "")
 * @body {number} price - Price, 0-10000000
 * @body {number|null} [compareAtPrice] - Compare-at price, 0-10000000
 * @body {number} stock - Stock, integer 0-100000
 * @body {number|null} [weight] - Weight, 0-100000
 * @body {string} [status] - `active` or `inactive` (default: "active")
 * @body {boolean} [isFeatured] - Featured flag (default: false)
 * @body {boolean} [mainShowcase] - Main showcase flag (default: false)
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - message: "Variant updated" or "Variant disabled"
 *   - variant: `id`, `price`, `stock`, `status`
 *   - removedImages: how many media rows were deleted while disabling
 *   - autoDisabledVariantIds: sibling variants left without photos and hidden
 *
 * @throws {400} Schema errors, or the activation gate failing (with `details` per field)
 * @throws {401} Unauthorized - No session, role too low, or session without a user id
 * @throws {403} Forbidden - Account not active or no role assigned
 * @throws {404} "Product not found" or "Variant not found"
 * @throws {409} Disabling is refused while the variant appears in order items
 * @throws {500} "Could not update the variant" - Database failure
 * @throws {502} ImageKit could not delete the variant's files, so nothing was changed
 *
 * @description Workflow:
 *   1. Initialize the manager guard and read the manager id, returning 401 when missing
 *   2. Await `context.params` and validate both references (min 2 chars)
 *   3. Parse the JSON body and validate it with `variantUpdateSchema`
 *   4. Initialize the database pool and take a connection
 *   5. Resolve the product id and the variant id, returning 404 when either is missing
 *   6. Load the variant with `loadVariant`, returning 404 when missing
 *   7. Detect activation (inactive → active) and disabling (active → inactive)
 *   8. On activation: collect the copy-length problems from `VARIANT_ACTIVATION_RULES`
 *   9. On activation: require at least one media row, uploaded or linked
 *   10. On activation: return 400 with the first problem and the full `details` map
 *   11. On disabling: count `order_items` for the variant and return 409 when non-zero
 *   12. On disabling: load its original (non-link) image rows and delete each ImageKit file,
 *       returning 502 if any deletion fails
 *   13. Begin a transaction
 *   14. On disabling: unlink and hide emptied sibling variants, count and delete the media rows
 *   15. Update `product_variants` (copy, price, compare-at, stock, weight, status, badges,
 *       `updated_by`, `updated_at`)
 *   16. Touch `products.updated_by` and `updated_at`, then commit (rollback on error)
 *   17. Write an UPDATE / VARIANT audit entry with price, stock, status and media effects,
 *       swallowing audit errors
 *   18. Return 200 response with the new price, stock, status and media effects
 *   19. Map `ER_DUP_ENTRY` to a field error; otherwise return 500
 *   20. Release the connection in `finally`
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> },
) {
  const guard = await requireManager({
    label: "PUT /api/manager/product-studio/[id]/variants/[variantId]",
  });
  if (!guard.ok) return guard.response;

  const managerId = guard.session.user.id;
  if (!managerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: productRef, variantId: variantRef } = await params;
  if (!productRef || productRef.length < 2) {
    return NextResponse.json(
      { error: "Invalid product reference" },
      { status: 400 },
    );
  }
  if (!variantRef || variantRef.length < 2) {
    return NextResponse.json(
      { error: "Invalid variant reference" },
      { status: 400 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = variantUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return invalidInput(parsed.error.flatten().fieldErrors);
  }
  const data = parsed.data;

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const productId = await resolveProductId(conn, productRef);
    if (!productId) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    const variantId = await resolveVariantId(conn, productId, variantRef);
    if (!variantId) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    const variant = await loadVariant(conn, productId, variantId);
    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    const now = getCurrentDateTime();
    const activating = variant.status === "inactive" && data.status === "active";
    const disabling = variant.status === "active" && data.status === "inactive";

    /* ---- activation gate: only a presentable variant may go live ---- */
    if (activating) {
      const problems: Record<string, string[]> = {};

      if (data.name.trim().length < VARIANT_ACTIVATION_RULES.name) {
        problems.name = [
          `Name must be at least ${VARIANT_ACTIVATION_RULES.name} characters long`,
        ];
      }
      if (
        data.briefDescription.trim().length <
        VARIANT_ACTIVATION_RULES.briefDescription
      ) {
        problems.briefDescription = [
          `Short description must be at least ${VARIANT_ACTIVATION_RULES.briefDescription} characters long`,
        ];
      }
      if (
        data.description.trim().length < VARIANT_ACTIVATION_RULES.description
      ) {
        problems.description = [
          `Description must be at least ${VARIANT_ACTIVATION_RULES.description} characters long`,
        ];
      }

      const [mediaRows] = await conn.query<OrderCountRow[]>(
        `SELECT COUNT(*) AS total
           FROM imagekit_files
          WHERE file_purpose = 'product_variant_image'
            AND entity_type = 'product_variant'
            AND entity_id = ?`,
        [variantId],
      );
      if (Number(mediaRows[0]?.total ?? 0) === 0) {
        problems.media = [
          "Add at least one photo — an upload or a linked photo — before activating",
        ];
      }

      const firstProblem = Object.values(problems)[0]?.[0];
      if (firstProblem) {
        return NextResponse.json(
          { error: firstProblem, details: problems },
          { status: 400 },
        );
      }
    }

    /* ---- disabling frees the photos, and is refused once the variant sold ---- */
    let ownedFiles: OwnedFileRow[] = [];
    let removedImages = 0;
    let autoDisabledVariantIds: string[] = [];

    if (disabling) {
      const [orderRows] = await conn.query<OrderCountRow[]>(
        `SELECT COUNT(*) AS total FROM order_items WHERE variant_id = ?`,
        [variantId],
      );
      const orderCount = Number(orderRows[0]?.total ?? 0);
      if (orderCount > 0) {
        return NextResponse.json(
          {
            error: `This variant appears in ${orderCount} order${orderCount === 1 ? "" : "s"} and cannot be disabled.`,
          },
          { status: 409 },
        );
      }

      const [fileRows] = await conn.query<OwnedFileRow[]>(
        `SELECT id, file_id
           FROM imagekit_files
          WHERE entity_type = 'product_variant'
            AND file_purpose = 'product_variant_image'
            AND entity_id = ?
            AND source_image_id IS NULL`,
        [variantId],
      );
      ownedFiles = fileRows;

      /* ImageKit first — a failed delete must never leave an orphan object
         behind. A 404 counts as success (the file was already gone). */
      for (const file of ownedFiles) {
        if (!file.file_id) continue;
        const removed = await ImageKitService.deleteFileStrict(file.file_id);
        if (!removed) {
          return NextResponse.json(
            {
              error:
                "Could not delete this variant's image files from ImageKit. Nothing was changed — try again.",
            },
            { status: 502 },
          );
        }
      }
    }

    await conn.beginTransaction();
    try {
      if (disabling) {
        const originalImageIds = ownedFiles.map((file) => file.id);
        autoDisabledVariantIds = await unlinkAndHideEmptyVariants(
          conn,
          originalImageIds,
          variantId,
          managerId,
          now,
        );

        const [mediaCountRows] = await conn.query<OrderCountRow[]>(
          `SELECT COUNT(*) AS total
             FROM imagekit_files
            WHERE entity_type = 'product_variant'
              AND file_purpose = 'product_variant_image'
              AND entity_id = ?`,
          [variantId],
        );
        removedImages = Number(mediaCountRows[0]?.total ?? 0);

        await conn.query(
          `DELETE FROM imagekit_files
            WHERE entity_type = 'product_variant'
              AND file_purpose = 'product_variant_image'
              AND entity_id = ?`,
          [variantId],
        );
      }

      await conn.query(
        `UPDATE product_variants
            SET name = ?,
                brief_description = ?,
                description = ?,
                price = ?,
                compare_at_price = ?,
                stock = ?,
                weight = ?,
                status = ?,
                is_featured = ?,
                main_showcase = ?,
                updated_by = ?,
                updated_at = ?
          WHERE id = ? AND product_id = ?`,
        [
          data.name || null,
          data.briefDescription || null,
          data.description || null,
          data.price,
          data.compareAtPrice ?? null,
          data.stock,
          data.weight ?? null,
          data.status,
          data.isFeatured ? 1 : 0,
          data.mainShowcase ? 1 : 0,
          managerId,
          now,
          variantId,
          productId,
        ],
      );

      await conn.query(
        `UPDATE products SET updated_by = ?, updated_at = ? WHERE id = ?`,
        [managerId, now, productId],
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback().catch(() => {});
      throw err;
    }

    try {
      await auditLog.log(pool, {
        userId: managerId,
        action: "UPDATE",
        entityType: "VARIANT",
        entityId: variantId,
        description: `Variant updated. [id=${variantId}, sku=${variant.sku}, price=${data.price}, stock=${data.stock}, status=${data.status}${disabling ? `, removedImages=${removedImages}` : ""}${autoDisabledVariantIds.length > 0 ? `, autoDisabled=${autoDisabledVariantIds.join("|")}` : ""}]`,
      });
    } catch {
      /* audit must never break the response */
    }

    return NextResponse.json({
      ok: true,
      message: disabling ? "Variant disabled" : "Variant updated",
      variant: {
        id: variantId,
        price: data.price,
        stock: data.stock,
        status: data.status,
      },
      removedImages,
      autoDisabledVariantIds,
    });
  } catch (err) {
    if (isDuplicateEntry(err)) {
      return invalidInput({
        name: ["Another variant already uses this detail"],
      });
    }
    console.error("[PRODUCT STUDIO - VARIANT - PUT]", err);
    return NextResponse.json(
      { error: "Could not update the variant" },
      { status: 500 },
    );
  } finally {
    conn.release();
  }
}
/* -------------------------------------------------------------------------- */
/*  DELETE /api/manager/product-studio/[id]/variants/[variantId]              */
/*  Removes a variant, its images and every link other variants made to them. */
/*  Variants referenced by an order must be deactivated instead.              */
/* -------------------------------------------------------------------------- */

interface OrderCountRow extends RowDataPacket {
  total: number | string;
}

interface OwnedFileRow extends RowDataPacket {
  id: string;
  file_id: string | null;
}

/**
 * Deletes a variant together with its images and every link other variants made to them.
 *
 * @async
 * @function DELETE
 * @description Refuses with 409 while `order_items` references the variant (deactivate instead).
 *              Owned ImageKit files are deleted before any database work, so a failed deletion
 *              leaves nothing orphaned and returns 502. Inside a transaction it unlinks and hides
 *              sibling variants left without photos, deletes the variant's media rows, deletes
 *              the variant row and touches the product.
 *
 * @param {NextRequest} _req - The incoming HTTP request (unused)
 * @param {Object} context - Next.js route context
 * @param {Promise<{ id: string, variantId: string }>} context.params - Route parameters
 *        (`(await context.params).id` and `.variantId`, both min 2 chars)
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - message: "Variant deleted"
 *   - deletedId: the removed variant id
 *   - deletedImages: number of owned image rows deleted
 *   - autoDisabledVariantIds: sibling variants left without photos and hidden
 *
 * @throws {400} "Invalid product reference" or "Invalid variant reference"
 * @throws {401} Unauthorized - No session, role too low, or session without a user id
 * @throws {403} Forbidden - Account not active or no role assigned
 * @throws {404} "Product not found" or "Variant not found"
 * @throws {409} The variant appears in order items and cannot be deleted
 * @throws {500} "Could not delete the variant" - Database failure
 * @throws {502} ImageKit could not delete the variant's files, so nothing was removed
 *
 * @description Workflow:
 *   1. Initialize the manager guard and read the manager id, returning 401 when missing
 *   2. Await `context.params` and validate both references (min 2 chars)
 *   3. Initialize the database pool and take a connection
 *   4. Resolve the product id and the variant id, returning 404 when either is missing
 *   5. Load the variant with `loadVariant`, returning 404 when missing
 *   6. Count `order_items` for the variant and return 409 when non-zero
 *   7. Load the variant's original (non-link) image rows
 *   8. Delete each ImageKit file first, returning 502 if any deletion fails
 *   9. Begin a transaction
 *   10. Unlink and hide sibling variants that the deleted photos left empty
 *   11. Delete the variant's media rows, then the variant row itself
 *   12. Touch `products.updated_by` and `updated_at`, then commit (rollback on error)
 *   13. Write a DELETE / VARIANT audit entry with the SKU and image count, swallowing audit errors
 *   14. Return 200 response with the deleted id, image count and auto-disabled variants
 *   15. Release the connection in `finally`
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> },
) {
  const guard = await requireManager({
    label: "DELETE /api/manager/product-studio/[id]/variants/[variantId]",
  });
  if (!guard.ok) return guard.response;

  const managerId = guard.session.user.id;
  if (!managerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: productRef, variantId: variantRef } = await params;
  if (!productRef || productRef.length < 2) {
    return NextResponse.json(
      { error: "Invalid product reference" },
      { status: 400 },
    );
  }
  if (!variantRef || variantRef.length < 2) {
    return NextResponse.json(
      { error: "Invalid variant reference" },
      { status: 400 },
    );
  }

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const productId = await resolveProductId(conn, productRef);
    if (!productId) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    const variantId = await resolveVariantId(conn, productId, variantRef);
    if (!variantId) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    const variant = await loadVariant(conn, productId, variantId);
    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    const [orderRows] = await conn.query<OrderCountRow[]>(
      `SELECT COUNT(*) AS total FROM order_items WHERE variant_id = ?`,
      [variantId],
    );
    const orderCount = Number(orderRows[0]?.total ?? 0);
    if (orderCount > 0) {
      return NextResponse.json(
        {
          error: `This variant appears in ${orderCount} order${orderCount === 1 ? "" : "s"} and cannot be deleted. Mark it inactive instead.`,
        },
        { status: 409 },
      );
    }

    const [fileRows] = await conn.query<OwnedFileRow[]>(
      `SELECT id, file_id
         FROM imagekit_files
        WHERE entity_type = 'product_variant'
          AND file_purpose = 'product_variant_image'
          AND entity_id = ?
          AND source_image_id IS NULL`,
      [variantId],
    );

    /* 1. ImageKit first. If any file cannot be deleted, abort before touching
       the database — a failed variant delete must never leave an orphan file
       behind. A 404 counts as success (the file was already gone). */
    for (const file of fileRows) {
      if (!file.file_id) continue;
      const removed = await ImageKitService.deleteFileStrict(file.file_id);
      if (!removed) {
        return NextResponse.json(
          {
            error:
              "Could not delete this variant's image files from ImageKit. Nothing was removed — try again.",
          },
          { status: 502 },
        );
      }
    }

    /* 2. Then the database: links other variants made to this variant's
       originals, this variant's own images (uploads + links), then the
       variant row itself. */
    const now = getCurrentDateTime();
    const originalImageIds = fileRows.map((file) => file.id);

    await conn.beginTransaction();
    let autoDisabledVariantIds: string[] = [];
    try {
      autoDisabledVariantIds = await unlinkAndHideEmptyVariants(
        conn,
        originalImageIds,
        variantId,
        managerId,
        now,
      );
      await conn.query(`DELETE FROM imagekit_files WHERE entity_id = ?`, [
        variantId,
      ]);
      await conn.query(
        `DELETE FROM product_variants WHERE id = ? AND product_id = ?`,
        [variantId, productId],
      );
      await conn.query(
        `UPDATE products SET updated_by = ?, updated_at = ? WHERE id = ?`,
        [managerId, now, productId],
      );
      await conn.commit();
    } catch (err) {
      await conn.rollback().catch(() => {});
      throw err;
    }

    try {
      await auditLog.log(pool, {
        userId: managerId,
        action: "DELETE",
        entityType: "VARIANT",
        entityId: variantId,
        description: `Variant deleted. [id=${variantId}, sku=${variant.sku}, productId=${productId}, images=${fileRows.length}${autoDisabledVariantIds.length > 0 ? `, autoDisabled=${autoDisabledVariantIds.join("|")}` : ""}]`,
      });
    } catch {
      /* audit must never break the response */
    }

    return NextResponse.json({
      ok: true,
      message: "Variant deleted",
      deletedId: variantId,
      deletedImages: fileRows.length,
      autoDisabledVariantIds,
    });
  } catch (err) {
    console.error("[PRODUCT STUDIO - VARIANT - DELETE]", err);
    return NextResponse.json(
      { error: "Could not delete the variant" },
      { status: 500 },
    );
  } finally {
    conn.release();
  }
}
