import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { requireManager } from "../../../../../../../../utils/Auth/Auth.requireRole.util";
import { getPool } from "../../../../../../../../lib/Database/main.db";
import type {
  AvailableImageGroup,
  AvailableImagesResponse,
} from "../../../../../../../../utils/zod/product/manager.productDetail.zod";

/* -------------------------------------------------------------------------- */
/*  Row types — must extend RowDataPacket for mysql2's generic query()        */
/* -------------------------------------------------------------------------- */

interface IdRow extends RowDataPacket {
  id: string;
}

interface AvailableRow extends RowDataPacket {
  variant_id: string;
  variant_name: string | null;
  sku: string;
  image_id: string;
  url: string;
  alt_text: string | null;
  already_linked: number | boolean;
}

/* -------------------------------------------------------------------------- */
/*  GET .../variants/[variantId]/available-images                             */
/*  Every other variant of the same product that still owns original photos.  */
/*  Linked rows are never offered as a source, so linking stays one hop deep. */
/* -------------------------------------------------------------------------- */

/**
 * Lists photos from the product's other variants that this variant can link to.
 *
 * @async
 * @function GET
 * @description Returns the original uploads owned by sibling variants of the same product,
 *              grouped by variant, with a per-photo `alreadyLinked` flag. Only original rows (no
 *              `source_image_id`, with a real ImageKit `file_id`) are offered, so a link can never
 *              become somebody else's source and linking stays one hop deep.
 *
 * @param {NextRequest} _req - The incoming HTTP request (unused)
 * @param {Object} context - Next.js route context
 * @param {Promise<{ id: string, variantId: string }>} context.params - Route parameters
 *        (`(await context.params).id` and `.variantId`, both min 2 chars)
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - groups: per sibling variant `{ variantId, variantName, sku, images }`, each image with
 *             `{ id, url, altText, alreadyLinked }`
 *
 * @throws {400} "Invalid product reference" or "Invalid variant reference"
 * @throws {401} Unauthorized - No session
 * @throws {403} Forbidden - Account not active, no role, or role below manager
 * @throws {404} "Product not found" or "Variant not found for this product"
 * @throws {500} "Could not load the existing photos" - Database failure
 *
 * @description Workflow:
 *   1. Initialize the manager guard (session, active status, role rank)
 *   2. Await `context.params` and validate both references (min 2 chars)
 *   3. Initialize the database pool and take a connection
 *   4. Resolve the product by `id` or `code`, returning 404 when missing
 *   5. Resolve the variant by `id` or `sku` inside that product, returning 404 when missing
 *   6. Select original photos of every other variant of the product, with an EXISTS check
 *      for an existing link to this variant
 *   7. Group the rows by source variant, preserving variant and photo order
 *   8. Return 200 response with the groups
 *   9. Release the connection in `finally`
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> },
) {
  const guard = await requireManager({
    label:
      "GET /api/manager/product-studio/[id]/variants/[variantId]/available-images",
  });
  if (!guard.ok) return guard.response;

  const { id: productRef, variantId } = await params;
  if (!productRef || productRef.length < 2) {
    return NextResponse.json(
      { error: "Invalid product reference" },
      { status: 400 },
    );
  }
  if (!variantId || variantId.length < 2) {
    return NextResponse.json(
      { error: "Invalid variant reference" },
      { status: 400 },
    );
  }

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const [productRows] = await conn.query<IdRow[]>(
      `SELECT id FROM products WHERE id = ? OR code = ? LIMIT 1`,
      [productRef, productRef],
    );
    const productId = productRows[0]?.id;
    if (!productId) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const [variantRows] = await conn.query<IdRow[]>(
      `SELECT id FROM product_variants
        WHERE product_id = ? AND (id = ? OR sku = ?)
        LIMIT 1`,
      [productId, variantId, variantId],
    );
    if (!variantRows[0]) {
      return NextResponse.json(
        { error: "Variant not found for this product" },
        { status: 404 },
      );
    }
    const resolvedVariantId = variantRows[0].id;

    const [rows] = await conn.query<AvailableRow[]>(
      `SELECT v.id           AS variant_id,
              v.name         AS variant_name,
              v.sku,
              f.id           AS image_id,
              f.url,
              f.alt_text,
              EXISTS (
                SELECT 1
                  FROM imagekit_files l
                 WHERE l.source_image_id = f.id
                   AND l.entity_id = ?
              )              AS already_linked
         FROM product_variants v
         JOIN imagekit_files f
           ON f.entity_id = v.id
          AND f.entity_type = 'product_variant'
          AND f.file_purpose = 'product_variant_image'
          AND f.source_image_id IS NULL
          AND f.file_id IS NOT NULL
        WHERE v.product_id = ?
          AND v.id <> ?
        ORDER BY v.created_at ASC, v.id ASC,
                 f.sort_order ASC, f.created_at ASC`,
      [resolvedVariantId, productId, resolvedVariantId],
    );

    const groupsById = new Map<string, AvailableImageGroup>();
    for (const row of rows) {
      let group = groupsById.get(row.variant_id);
      if (!group) {
        group = {
          variantId: row.variant_id,
          variantName: row.variant_name ?? "",
          sku: row.sku,
          images: [],
        };
        groupsById.set(row.variant_id, group);
      }
      group.images.push({
        id: row.image_id,
        url: row.url,
        altText: row.alt_text ?? "",
        alreadyLinked: Boolean(row.already_linked),
      });
    }

    const payload: AvailableImagesResponse = {
      ok: true,
      groups: [...groupsById.values()],
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error("[PRODUCT STUDIO - AVAILABLE IMAGES - GET]", err);
    return NextResponse.json(
      { error: "Could not load the existing photos" },
      { status: 500 },
    );
  } finally {
    conn.release();
  }
}
