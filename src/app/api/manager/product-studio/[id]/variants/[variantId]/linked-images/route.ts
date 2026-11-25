import { NextRequest, NextResponse } from "next/server";
import {
  invalidInput,
  isDuplicateEntry,
} from "../../../../../../../../utils/Api/apiResponse.util";

import { resolveProductId } from "../../../../../../../../utils/ProductStudio/productStudio.lookup.util";
import type { RowDataPacket } from "mysql2";
import { requireManager } from "../../../../../../../../utils/Auth/Auth.requireRole.util";
import { getPool } from "../../../../../../../../lib/Database/main.db";
import { getCurrentDateTime } from "../../../../../../../../utils/ValueFetcher/getDateTime.util";
import { generateULID } from "../../../../../../../../utils/generateULID.util";
import { auditLog } from "../../../../../../../../services/AuditLog.service";
import { linkExistingImagesSchema } from "../../../../../../../../utils/zod/product/manager.productDetail.zod";

/* -------------------------------------------------------------------------- */
/*  Row types — must extend RowDataPacket for mysql2's generic query()        */
/* -------------------------------------------------------------------------- */

interface VariantRow extends RowDataPacket {
  id: string;
  product_id: string;
}

interface OriginalRow extends RowDataPacket {
  id: string;
  url: string;
  alt_text: string | null;
  file_name: string | null;
  owner_variant_id: string;
}

interface ExistingLinkRow extends RowDataPacket {
  source_image_id: string;
}

interface LinkRow extends RowDataPacket {
  id: string;
  entity_id: string;
  source_image_id: string | null;
}

interface SortOrderRow extends RowDataPacket {
  next_order: number | string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function isMissingReference(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "ER_NO_REFERENCED_ROW_2"
  );
}

/* -------------------------------------------------------------------------- */
/*  POST /api/manager/product-studio/[id]/variants/[variantId]/linked-images  */
/*  Attach photos that already exist on another variant of the same product.  */
/*  Only the original row's ImageKit file is reused — no new upload, no copy. */
/* -------------------------------------------------------------------------- */

/**
 * Links photos that already exist on another variant of the same product.
 *
 * @async
 * @function POST
 * @description Validates with `linkExistingImagesSchema` and de-duplicates the ids. Every id must
 *              be an original upload (no `source_image_id`, real `file_id`) owned by a sibling
 *              variant of this product, otherwise the whole request fails. New `imagekit_files`
 *              rows are inserted with `source_image_id` pointing at the original and no `file_id`
 *              of their own — no upload and no copy happens. Photos already linked are skipped,
 *              including a concurrent duplicate insert.
 *
 * @param {NextRequest} req - The incoming HTTP request with a JSON body
 * @param {Object} context - Next.js route context
 * @param {Promise<{ id: string, variantId: string }>} context.params - Route parameters
 *        (`(await context.params).id` and `.variantId`, both min 2 chars)
 *
 * @body {string[]} imageIds - Original image ids to link (1-60 ids, 10-40 chars each)
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - message: "Photo linked to this variant" or "<n> photos linked to this variant"
 *   - linkedCount: rows inserted
 *   - skippedCount: photos that were already linked
 *   - linkedImages: `{ id, sourceImageId, url, ownerVariantId }` per new link
 *
 * @throws {400} Schema errors, or ids that are no longer available on this product
 * @throws {401} Unauthorized - No session, role too low, or session without a user id
 * @throws {403} Forbidden - Account not active or no role assigned
 * @throws {404} "Product not found" or "Variant not found for this product"
 * @throws {409} A source photo was deleted while the selection was being made
 * @throws {500} "Could not link the selected photos" - Database failure
 *
 * @description Workflow:
 *   1. Initialize the manager guard and read the manager id, returning 401 when missing
 *   2. Await `context.params` and validate both references (min 2 chars)
 *   3. Parse the JSON body and validate it with `linkExistingImagesSchema`
 *   4. De-duplicate `imageIds`
 *   5. Initialize the database pool and take a connection
 *   6. Resolve the product id, returning 404 when missing
 *   7. Resolve the variant inside that product, returning 404 when missing
 *   8. Load the candidate originals from sibling variants, requiring all ids to resolve
 *   9. Load the photos already linked to this variant
 *   10. Compute the next `sort_order` for the variant
 *   11. Begin a transaction
 *   12. Per unlinked id: insert an `imagekit_files` link row (`img` ULID, `file_id` NULL,
 *       url/name/alt copied from the original), skipping duplicates
 *   13. Commit the transaction
 *   14. Write an UPDATE / VARIANT audit entry with the linked source ids, swallowing audit errors
 *   15. Return 200 response with linked, skipped and created links
 *   16. Roll back on error; map a missing FK to 409, otherwise 500
 *   17. Release the connection in `finally`
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> },
) {
  const guard = await requireManager({
    label:
      "POST /api/manager/product-studio/[id]/variants/[variantId]/linked-images",
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
  const parsed = linkExistingImagesSchema.safeParse(json);
  if (!parsed.success) {
    return invalidInput(parsed.error.flatten().fieldErrors);
  }
  const imageIds = [...new Set(parsed.data.imageIds)];

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const productId = await resolveProductId(conn, productRef);
    if (!productId) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const [variantRows] = await conn.query<VariantRow[]>(
      `SELECT id, product_id FROM product_variants
        WHERE product_id = ? AND (id = ? OR sku = ?)
        LIMIT 1`,
      [productId, variantRef, variantRef],
    );
    if (!variantRows[0]) {
      return NextResponse.json(
        { error: "Variant not found for this product" },
        { status: 404 },
      );
    }
    const variantId = variantRows[0].id;

    /* Only originals from sibling variants are linkable. This is what keeps
       linking shallow: a link row can never become somebody else's source. */
    const [originalRows] = await conn.query<OriginalRow[]>(
      `SELECT f.id, f.url, f.alt_text, f.file_name,
              f.entity_id AS owner_variant_id
         FROM imagekit_files f
         JOIN product_variants v ON v.id = f.entity_id
        WHERE f.id IN (?)
          AND f.file_purpose = 'product_variant_image'
          AND f.entity_type = 'product_variant'
          AND f.source_image_id IS NULL
          AND f.file_id IS NOT NULL
          AND v.product_id = ?
          AND f.entity_id <> ?`,
      [imageIds, productId, variantId],
    );

    if (originalRows.length !== imageIds.length) {
      return NextResponse.json(
        {
          error:
            "Some of those photos are no longer available on this product. Refresh and try again.",
        },
        { status: 400 },
      );
    }

    const [existingRows] = await conn.query<ExistingLinkRow[]>(
      `SELECT source_image_id
         FROM imagekit_files
        WHERE entity_id = ? AND source_image_id IN (?)`,
      [variantId, imageIds],
    );
    const alreadyLinked = new Set(
      existingRows.map((row) => row.source_image_id),
    );

    const now = getCurrentDateTime();
    const [orderRows] = await conn.query<SortOrderRow[]>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
         FROM imagekit_files
        WHERE file_purpose = 'product_variant_image'
          AND entity_type = 'product_variant'
          AND entity_id = ?`,
      [variantId],
    );
    const startOrder = Number(orderRows[0]?.next_order ?? 0);

    const originalsById = new Map(originalRows.map((row) => [row.id, row]));
    const links: {
      id: string;
      sourceImageId: string;
      url: string;
      ownerVariantId: string;
    }[] = [];

    await conn.beginTransaction();

    for (const imageId of imageIds) {
      if (alreadyLinked.has(imageId)) continue;

      const original = originalsById.get(imageId);
      if (!original) continue;

      const linkId = generateULID("img");

      try {
        await conn.query(
          `INSERT INTO imagekit_files
             (id, source_image_id, entity_id, file_id, url, file_purpose,
              file_name, alt_text, sort_order, created_by, created_at,
              updated_at, entity_type)
           VALUES (?, ?, ?, NULL, ?, 'product_variant_image', ?, ?, ?, ?, ?, NULL,
                   'product_variant')`,
          [
            linkId,
            original.id,
            variantId,
            original.url,
            original.file_name,
            original.alt_text,
            startOrder + links.length,
            managerId,
            now,
          ],
        );
      } catch (err) {
        /* Another tab linked the same photo between our check and this insert:
           the unique key already carries it, so just skip it. */
        if (isDuplicateEntry(err)) continue;
        throw err;
      }

      links.push({
        id: linkId,
        sourceImageId: original.id,
        url: original.url,
        ownerVariantId: original.owner_variant_id,
      });
    }

    await conn.commit();

    try {
      await auditLog.log(pool, {
        userId: managerId,
        action: "UPDATE",
        entityType: "VARIANT",
        entityId: variantId,
        description: `Linked ${links.length} existing photo${links.length === 1 ? "" : "s"} to a variant. [productId=${productId}, variantId=${variantId}, skipped=${alreadyLinked.size}]`,
        metadata: { imageIds: links.map((link) => link.sourceImageId) },
      });
    } catch {
      /* audit must never break the response */
    }

    return NextResponse.json({
      ok: true,
      message:
        links.length === 1
          ? "Photo linked to this variant"
          : `${links.length} photos linked to this variant`,
      linkedCount: links.length,
      skippedCount: alreadyLinked.size,
      linkedImages: links,
    });
  } catch (err) {
    await conn.rollback().catch(() => {});
    if (isMissingReference(err)) {
      return NextResponse.json(
        {
          error:
            "One of those photos was deleted while you were choosing. Refresh and try again.",
        },
        { status: 409 },
      );
    }
    console.error("[PRODUCT STUDIO - LINKED IMAGES - POST]", err);
    return NextResponse.json(
      { error: "Could not link the selected photos" },
      { status: 500 },
    );
  } finally {
    conn.release();
  }
}

/* -------------------------------------------------------------------------- */
/*  DELETE .../linked-images?id=<link row id>                                 */
/*  Removes only the link row. The original ImageKit file is never touched.   */
/* -------------------------------------------------------------------------- */

/**
 * Removes one link row from a variant, leaving the original ImageKit file untouched.
 *
 * @async
 * @function DELETE
 * @description Validates the link id shape, confirms the row belongs to this variant and product,
 *              rejects an original upload with 400 (use the media delete for that) and deletes
 *              only the link row. The stored ImageKit file the original owns is never touched.
 *
 * @param {NextRequest} req - The incoming HTTP request
 * @param {Object} context - Next.js route context
 * @param {Promise<{ id: string, variantId: string }>} context.params - Route parameters
 *        (`(await context.params).id` and `.variantId`, both min 2 chars)
 * @query {string} id - `imagekit_files.id` of the link row (10-40 chars)
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - message: "Photo removed from this variant"
 *   - unlinked: `true`
 *   - deletedId: the removed link row id
 *
 * @throws {400} "Invalid link id", or the row is an original upload rather than a link
 * @throws {401} Unauthorized - No session, role too low, or session without a user id
 * @throws {403} Forbidden - Account not active or no role assigned
 * @throws {404} "Product not found", "Variant not found for this product" or "Link not found"
 * @throws {500} "Could not remove the linked photo" - Database failure
 *
 * @description Workflow:
 *   1. Initialize the manager guard and read the manager id, returning 401 when missing
 *   2. Await `context.params` and validate both references (min 2 chars)
 *   3. Read and length-check `?id=` (10-40)
 *   4. Initialize the database pool and take a connection
 *   5. Resolve the product id, returning 404 when missing
 *   6. Resolve the variant inside that product, returning 404 when missing
 *   7. Load the row scoped to the variant, product and `product_variant_image` purpose
 *   8. Return 400 when the row has no `source_image_id` (it is an original upload)
 *   9. Delete only the link row from `imagekit_files`
 *   10. Write an UPDATE / VARIANT audit entry with the source image id, swallowing audit errors
 *   11. Return 200 response with `unlinked` and the removed id
 *   12. Release the connection in `finally`
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> },
) {
  const guard = await requireManager({
    label:
      "DELETE /api/manager/product-studio/[id]/variants/[variantId]/linked-images",
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

  const linkId = (req.nextUrl.searchParams.get("id") ?? "").trim();
  if (linkId.length < 10 || linkId.length > 40) {
    return NextResponse.json({ error: "Invalid link id" }, { status: 400 });
  }

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const productId = await resolveProductId(conn, productRef);
    if (!productId) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const [variantRows] = await conn.query<VariantRow[]>(
      `SELECT id, product_id FROM product_variants
        WHERE product_id = ? AND (id = ? OR sku = ?)
        LIMIT 1`,
      [productId, variantRef, variantRef],
    );
    const variantId = variantRows[0]?.id;
    if (!variantId) {
      return NextResponse.json(
        { error: "Variant not found for this product" },
        { status: 404 },
      );
    }

    const [rows] = await conn.query<LinkRow[]>(
      `SELECT f.id, f.entity_id, f.source_image_id
         FROM imagekit_files f
         JOIN product_variants v ON v.id = f.entity_id
        WHERE f.id = ?
          AND f.entity_id = ?
          AND v.product_id = ?
          AND f.file_purpose = 'product_variant_image'
        LIMIT 1`,
      [linkId, variantId, productId],
    );
    const link = rows[0];
    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }
    if (!link.source_image_id) {
      return NextResponse.json(
        {
          error:
            "That row is an original upload, not a link. Use the media delete to remove the file.",
        },
        { status: 400 },
      );
    }

    await conn.query(`DELETE FROM imagekit_files WHERE id = ?`, [link.id]);

    try {
      await auditLog.log(pool, {
        userId: managerId,
        action: "UPDATE",
        entityType: "VARIANT",
        entityId: variantId,
        description: `Linked photo removed from a variant. [productId=${productId}, variantId=${variantId}, linkId=${link.id}, sourceImageId=${link.source_image_id}]`,
      });
    } catch {
      /* audit must never break the response */
    }

    return NextResponse.json({
      ok: true,
      message: "Photo removed from this variant",
      unlinked: true,
      deletedId: link.id,
    });
  } catch (err) {
    console.error("[PRODUCT STUDIO - LINKED IMAGES - DELETE]", err);
    return NextResponse.json(
      { error: "Could not remove the linked photo" },
      { status: 500 },
    );
  } finally {
    conn.release();
  }
}
