import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { requireManager } from "../../../../../utils/Auth/Auth.requireRole.util";
import {
  ImageKitService,
  ImageKitUploadError,
} from "../../../../../services/Imagekit.service";
import { uploadImageParamsSchema } from "../../../../../utils/zod-schema/imagekit.schemas.zod";
import { getPool } from "../../../../../lib/Database/main.db";
import { getCurrentDateTime } from "../../../../../utils/ValueFetcher/getDateTime.util";
import { generateULID } from "../../../../../utils/generateULID.util";
import { auditLog } from "../../../../../services/AuditLog.service";

/* -------------------------------------------------------------------------- */
/*  Row types — must extend RowDataPacket for mysql2's generic query()        */
/* -------------------------------------------------------------------------- */

interface IdRow extends RowDataPacket {
  id: string;
}

interface SortOrderRow extends RowDataPacket {
  next_order: number | string;
}

interface MediaLookupRow extends RowDataPacket {
  image_id: string;
  file_id: string | null;
  url: string;
  entity_id: string;
  source_image_id: string | null;
}

interface LinkCountRow extends RowDataPacket {
  total: number | string;
}

/* -------------------------------------------------------------------------- */
/*  POST /api/manager/product-studio/media                                    */
/*  multipart/form-data: file, productId, variantId?, altText?                */
/*                                                                            */
/*  Public media (isPrivateFile: false) — ImageKit stores it under            */
/*  /<db-name>[-false]/products/<productId>[/variants/<variantId>].            */
/* -------------------------------------------------------------------------- */

/**
 * Uploads a variant photo to ImageKit and records it in `imagekit_files`.
 *
 * @async
 * @function POST
 * @description Accepts multipart form data, resolves the product by id or code and the
 *              variant by id or SKU, then uploads the file publicly into
 *              `/<env>/products/<productId>/variants/<variantId>` through
 *              `ImageKitService.upload`. The file is validated by `uploadImageParamsSchema`
 *              (max 15 MB). The row is inserted into `imagekit_files` as
 *              `product_variant_image` with the next `sort_order`, inside a transaction.
 *
 * @param {NextRequest} req - The incoming HTTP request with multipart form data
 * @formdata {File} file - Image file (max 15 MB)
 * @formdata {string} productId - Product id or product code (2-50 chars)
 * @formdata {string} variantId - Variant id or SKU (2-100 chars, required — base products
 *                               have no images)
 * @formdata {string} [altText] - Alt text stored on the row (empty means `NULL`)
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - message: "Image uploaded"
 *   - media: `id`, `url`, `fileId`, `altText`, `sortOrder`, `variantId` and `createdAt`
 *
 * @throws {400} Not multipart, invalid product reference, missing/invalid variant reference,
 *               or the file fails `uploadImageParamsSchema`
 * @throws {401} Unauthorized - No session, role too low, or session without a user id
 * @throws {403} Forbidden - Account not active or no role assigned
 * @throws {404} "Product not found" or "Variant not found for this product"
 * @throws {500} Database failure, or "Could not upload the image" (an `ImageKitUploadError`
 *               is re-thrown with its own ImageKit status and message)
 *
 * @description Workflow:
 *   1. Initialize the manager guard and read the manager id, returning 401 when missing
 *   2. Parse the form data, returning 400 when it is not multipart
 *   3. Read `file`, `productId`, `variantId` and `altText`
 *   4. Validate the product reference length (2-50) and the variant reference (2-100)
 *   5. Initialize the database pool and take a connection
 *   6. Resolve the product by `id` or `code`, returning 404 when missing
 *   7. Resolve the variant by `id` or `sku` inside that product, returning 404 when missing
 *   8. Build the ImageKit folder with `ImageKitService.envFolder`
 *   9. Validate `uploadImageParamsSchema` (15 MB cap, public file)
 *   10. Read the file into a buffer and upload it with `ImageKitService.upload`
 *   11. Compute the next `sort_order` for the variant's images
 *   12. Begin a transaction and insert into `imagekit_files` (`entity_type`
 *       `product_variant`, purpose `product_variant_image`)
 *   13. Commit the transaction
 *   14. Write a FILE_UPLOADED / IMAGEKIT_FILE audit entry, swallowing audit errors
 *   15. Return 201 response with the created media item
 *   16. Roll back on error, re-throw `ImageKitUploadError` with its status, else 500
 *   17. Release the connection in `finally`
 */
export async function POST(req: NextRequest) {
  const guard = await requireManager({
    label: "POST /api/manager/product-studio/media",
  });
  if (!guard.ok) return guard.response;

  const managerId = guard.session.user.id;
  if (!managerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 },
    );
  }

  const file = form.get("file");
  const productRef = String(form.get("productId") ?? "").trim();
  const variantRef = String(form.get("variantId") ?? "").trim();
  const altText = String(form.get("altText") ?? "").trim();

  if (productRef.length < 2 || productRef.length > 50) {
    return NextResponse.json(
      { error: "Invalid product reference" },
      { status: 400 },
    );
  }
  if (!variantRef || variantRef.length < 2 || variantRef.length > 100) {
    return NextResponse.json(
      { error: "variantId is required — base products do not have images" },
      { status: 400 },
    );
  }

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    /* Both the product code and the variant SKU are accepted, so the folder
       and stored entity_id always use the canonical ids. */
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
      [productId, variantRef, variantRef],
    );
    const variantId = variantRows[0]?.id;
    if (!variantId) {
      return NextResponse.json(
        { error: "Variant not found for this product" },
        { status: 404 },
      );
    }

    const folder = ImageKitService.envFolder(
      "products",
      productId,
      "variants",
      variantId,
    );

    const parsed = uploadImageParamsSchema.safeParse({
      file,
      folder,
      fileNamePrefix: "product",
      isPrivateFile: false,
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const uploadedFile = parsed.data.file;
    const buffer = Buffer.from(await uploadedFile.arrayBuffer());

    const uploaded = await ImageKitService.upload(buffer, {
      folder,
      fileName: uploadedFile.name || "product-image",
      isPrivateFile: false,
    });

    const fileId = String(uploaded.fileId);
    const url = String(uploaded.url);
    const fileName = String(uploaded.name ?? uploadedFile.name ?? "image");

    const now = getCurrentDateTime();

    const imageRowId = generateULID("img");

    const [orderRows] = await conn.query<SortOrderRow[]>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
         FROM imagekit_files f
        WHERE f.file_purpose = 'product_variant_image'
          AND f.entity_type = 'product_variant'
          AND f.entity_id = ?`,
      [variantId],
    );
    const sortOrder = Number(orderRows[0]?.next_order ?? 0);

    await conn.beginTransaction();

    await conn.query(
      `INSERT INTO imagekit_files
         (id, file_id, url, file_purpose, file_name, alt_text,
          sort_order, created_by, created_at, updated_at,
          entity_type, entity_id)
       VALUES (?, ?, ?, 'product_variant_image', ?, ?, ?, ?, ?, NULL,
               'product_variant', ?)`,
      [
        imageRowId,
        fileId,
        url,
        fileName,
        altText || null,
        sortOrder,
        managerId,
        now,
        variantId,
      ],
    );

    await conn.commit();

    try {
      await auditLog.log(pool, {
        userId: managerId,
        action: "FILE_UPLOADED",
        entityType: "IMAGEKIT_FILE",
        entityId: imageRowId,
        description: `Product image uploaded. [productId=${productId}, variantId=${variantId ?? "base"}, fileId=${fileId}]`,
      });
    } catch {
      /* audit must never break the response */
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Image uploaded",
        media: {
          id: imageRowId,
          url,
          fileId,
          altText,
          sortOrder,
          variantId,
          createdAt: now,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    await conn.rollback().catch(() => {});
    if (err instanceof ImageKitUploadError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[PRODUCT STUDIO - MEDIA - UPLOAD]", err);
    return NextResponse.json(
      { error: "Could not upload the image" },
      { status: 500 },
    );
  } finally {
    conn.release();
  }
}

/* -------------------------------------------------------------------------- */
/*  PUT /api/manager/product-studio/media                                     */
/*  Reorder a variant's photos. Body: { productId, variantId, imageIds[] }.    */
/*  `imageIds` must list every photo of that variant in the new order.        */
/* -------------------------------------------------------------------------- */

/**
 * Moves a variant photo one position earlier or later.
 *
 * @async
 * @function PUT
 * @description Resolves the product and variant, reads the variant's own photo ids in their
 *              current order (the server owns that list, so a stale client cannot send a
 *              mismatched one), swaps the target photo with its neighbour, then rewrites every
 *              `sort_order` in a transaction and touches `products.updated_at`. A photo already
 *              at the requested edge returns 200 with the unchanged order.
 *
 * @param {NextRequest} req - The incoming HTTP request with a JSON body
 * @body {string} productId - Product id or product code (2-50 chars)
 * @body {string} variantId - Variant id or SKU (2-100 chars)
 * @body {string} imageId - `imagekit_files` id of the photo to move (10-40 chars)
 * @body {string} direction - `earlier` or `later`
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - message: "Photo order updated", or "Photo is already at the edge"
 *   - imageIds: the persisted photo order
 *
 * @throws {400} Invalid product, variant, image id, or `direction`
 * @throws {401} Unauthorized - No session, role too low, or session without a user id
 * @throws {403} Forbidden - Account not active or no role assigned
 * @throws {404} "Product not found", "Variant not found for this product",
 *               "Photo not found on this variant"
 * @throws {500} "Could not update the photo order" - Database failure
 *
 * @description Workflow:
 *   1. Initialize the manager guard and read the manager id, returning 401 when missing
 *   2. Read `productId`, `variantId`, `imageId` and `direction` from the JSON body
 *   3. Validate each reference length and that `direction` is `earlier` or `later`
 *   4. Initialize the database pool and take a connection
 *   5. Resolve the product by `id` or `code`, returning 404 when missing
 *   6. Resolve the variant by `id` or `sku` inside that product, returning 404 when missing
 *   7. Select the variant's photo ids ordered by `sort_order`, `created_at` and `id`
 *   8. Return 404 when the photo is not on this variant
 *   9. Compute the neighbour index; return 200 with the unchanged order at an edge
 *   10. Swap the two entries
 *   11. Begin a transaction and rewrite `sort_order` for every photo from 0
 *   12. Touch `products.updated_by` and `updated_at`, then commit (rollback on error)
 *   13. Re-read the persisted order so the response cannot claim an unpersisted order
 *   14. Write an UPDATE / VARIANT audit entry with the final ids, swallowing audit errors
 *   15. Return 200 response with the final `imageIds`
 *   16. Release the connection in `finally`
 */
export async function PUT(req: NextRequest) {
  const guard = await requireManager({
    label: "PUT /api/manager/product-studio/media",
  });
  if (!guard.ok) return guard.response;

  const managerId = guard.session.user.id;
  if (!managerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = (await req.json().catch(() => null)) as {
    productId?: unknown;
    variantId?: unknown;
    imageId?: unknown;
    direction?: unknown;
  } | null;

  const productRef =
    typeof json?.productId === "string" ? json.productId.trim() : "";
  const variantRef =
    typeof json?.variantId === "string" ? json.variantId.trim() : "";
  const imageId = typeof json?.imageId === "string" ? json.imageId.trim() : "";
  const direction =
    json?.direction === "earlier" || json?.direction === "later"
      ? json.direction
      : null;

  if (productRef.length < 2 || productRef.length > 50) {
    return NextResponse.json(
      { error: "Invalid product reference" },
      { status: 400 },
    );
  }
  if (variantRef.length < 2 || variantRef.length > 100) {
    return NextResponse.json(
      { error: "Invalid variant reference" },
      { status: 400 },
    );
  }
  if (imageId.length < 10 || imageId.length > 40) {
    return NextResponse.json({ error: "Invalid image id" }, { status: 400 });
  }
  if (!direction) {
    return NextResponse.json(
      { error: 'direction must be "earlier" or "later"' },
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
      [productId, variantRef, variantRef],
    );
    const variantId = variantRows[0]?.id;
    if (!variantId) {
      return NextResponse.json(
        { error: "Variant not found for this product" },
        { status: 404 },
      );
    }

    /* The variant's own photos — uploads and linked copies alike — in their
       current order. The server owns this list, so a stale client can never
       send a mismatched one. */
    const [ownedRows] = await conn.query<IdRow[]>(
      `SELECT id FROM imagekit_files
        WHERE file_purpose = 'product_variant_image'
          AND entity_type = 'product_variant'
          AND entity_id = ?
        ORDER BY sort_order ASC, created_at ASC, id ASC`,
      [variantId],
    );

    const ordered = ownedRows.map((row) => row.id);
    const index = ordered.indexOf(imageId);
    if (index === -1) {
      return NextResponse.json(
        { error: "Photo not found on this variant" },
        { status: 404 },
      );
    }

    const target = index + (direction === "earlier" ? -1 : 1);
    if (target < 0 || target >= ordered.length) {
      return NextResponse.json({
        ok: true,
        message: "Photo is already at the edge",
        imageIds: ordered,
      });
    }

    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];

    const now = getCurrentDateTime();

    await conn.beginTransaction();
    try {
      for (let position = 0; position < ordered.length; position++) {
        await conn.query(
          `UPDATE imagekit_files
              SET sort_order = ?, updated_at = ?
            WHERE id = ? AND entity_id = ?`,
          [position, now, ordered[position], variantId],
        );
      }
      await conn.query(
        `UPDATE products SET updated_by = ?, updated_at = ? WHERE id = ?`,
        [managerId, now, productId],
      );
      await conn.commit();
    } catch (err) {
      await conn.rollback().catch(() => {});
      throw err;
    }

    /* Re-read what the database actually holds, so the response can never
       claim an order that was not persisted. */
    const [finalRows] = await conn.query<IdRow[]>(
      `SELECT id FROM imagekit_files
        WHERE file_purpose = 'product_variant_image'
          AND entity_type = 'product_variant'
          AND entity_id = ?
        ORDER BY sort_order ASC, created_at ASC, id ASC`,
      [variantId],
    );
    const finalIds = finalRows.map((row) => row.id);

    try {
      await auditLog.log(pool, {
        userId: managerId,
        action: "UPDATE",
        entityType: "VARIANT",
        entityId: variantId,
        description: `Variant photo order updated. [productId=${productId}, variantId=${variantId}, imageId=${imageId}, direction=${direction}]`,
        metadata: { imageIds: finalIds },
      });
    } catch {
      /* audit must never break the response */
    }

    return NextResponse.json({
      ok: true,
      message: "Photo order updated",
      imageIds: finalIds,
    });
  } catch (err) {
    console.error("[PRODUCT STUDIO - MEDIA - REORDER]", err);
    return NextResponse.json(
      { error: "Could not update the photo order" },
      { status: 500 },
    );
  } finally {
    conn.release();
  }
}

/* -------------------------------------------------------------------------- */
/*  DELETE /api/manager/product-studio/media?id=<imagekit_files.id>            */
/*  Removes the ImageKit file and its database rows.                          */
/* -------------------------------------------------------------------------- */

/**
 * Deletes a variant photo, or unlinks it when the row is a link to a sibling's upload.
 *
 * @async
 * @function DELETE
 * @description Link rows are simply removed from `imagekit_files` and never touch the original
 *              ImageKit file. For an original upload the ImageKit file is deleted first (a 404
 *              counts as success); if that fails the request returns 502 and nothing is removed.
 *              Then every link row that borrowed the file is deleted, followed by the original
 *              row, inside a transaction.
 *
 * @param {NextRequest} req - The incoming HTTP request
 * @query {string} id - `imagekit_files.id` (10-40 chars)
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - message: deletion or unlink message with the affected link count
 *   - deletedId: the removed row id
 *   - unlinked: `true` for a link row
 *   - linkedVariantCount, linksRemoved: how many link rows were removed
 *
 * @throws {400} "Invalid media id"
 * @throws {401} Unauthorized - No session, role too low, or session without a user id
 * @throws {403} Forbidden - Account not active or no role assigned
 * @throws {404} "Image not found" for this variant image purpose
 * @throws {500} "Could not delete the image" - Database failure
 * @throws {502} ImageKit deletion failed, so nothing was removed
 *
 * @description Workflow:
 *   1. Initialize the manager guard and read the manager id, returning 401 when missing
 *   2. Read and length-check `?id=` (10-40)
 *   3. Initialize the database pool and take a connection
 *   4. Load the image row scoped to `product_variant_image` / `product_variant`
 *   5. For a link row (`source_image_id` set) delete only that row, audit it and return 200
 *   6. Count the link rows that reference the original
 *   7. Delete the ImageKit file with `deleteFileStrict`, returning 502 on failure
 *   8. Begin a transaction, delete the link rows then the original row, and commit
 *   9. Write a FILE_DELETED / IMAGEKIT_FILE audit entry, swallowing audit errors
 *   10. Return 200 response with the deleted id and link counts
 *   11. Release the connection in `finally`
 */
export async function DELETE(req: NextRequest) {
  const guard = await requireManager({
    label: "DELETE /api/manager/product-studio/media",
  });
  if (!guard.ok) return guard.response;

  const managerId = guard.session.user.id;
  if (!managerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mediaId = (req.nextUrl.searchParams.get("id") ?? "").trim();
  if (mediaId.length < 10 || mediaId.length > 40) {
    return NextResponse.json({ error: "Invalid media id" }, { status: 400 });
  }

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query<MediaLookupRow[]>(
      `SELECT f.id AS image_id, f.file_id, f.url,
              f.entity_id, f.source_image_id
         FROM imagekit_files f
        WHERE f.id = ?
          AND f.file_purpose = 'product_variant_image'
          AND f.entity_type = 'product_variant'
        LIMIT 1`,
      [mediaId],
    );
    const media = rows[0];
    if (!media) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    /* A link row only references a sibling variant's upload. Removing it must
       never touch the ImageKit file, which the original still owns. */
    if (media.source_image_id) {
      await conn.query(`DELETE FROM imagekit_files WHERE id = ?`, [
        media.image_id,
      ]);

      try {
        await auditLog.log(pool, {
          userId: managerId,
          action: "UPDATE",
          entityType: "IMAGEKIT_FILE",
          entityId: media.image_id,
          description: `Linked product image removed from a variant. [mediaId=${mediaId}, variantId=${media.entity_id}, sourceImageId=${media.source_image_id}]`,
        });
      } catch {
        /* audit must never break the response */
      }

      return NextResponse.json({
        ok: true,
        message: "Photo removed from this variant",
        unlinked: true,
        deletedId: mediaId,
      });
    }

    const [linkRows] = await conn.query<LinkCountRow[]>(
      `SELECT COUNT(*) AS total
         FROM imagekit_files
        WHERE source_image_id = ?`,
      [media.image_id],
    );
    const linkedVariantCount = Number(linkRows[0]?.total ?? 0);

    /* ImageKit first: if the file cannot be deleted we abort before touching
       the database, so a failed delete never leaves an orphan file behind.
       A 404 counts as success (already gone), which still lets every link be
       cleaned up. Then links, then the original row. */
    if (media.file_id) {
      const removed = await ImageKitService.deleteFileStrict(media.file_id);
      if (!removed) {
        return NextResponse.json(
          {
            error:
              "Could not delete the image file from ImageKit. Nothing was removed — try again.",
          },
          { status: 502 },
        );
      }
    }

    await conn.beginTransaction();
    try {
      await conn.query(`DELETE FROM imagekit_files WHERE source_image_id = ?`, [
        media.image_id,
      ]);
      await conn.query(`DELETE FROM imagekit_files WHERE id = ?`, [
        media.image_id,
      ]);
      await conn.commit();
    } catch (err) {
      await conn.rollback().catch(() => {});
      throw err;
    }

    try {
      await auditLog.log(pool, {
        userId: managerId,
        action: "FILE_DELETED",
        entityType: "IMAGEKIT_FILE",
        entityId: media.image_id,
        description: `Product image deleted. [mediaId=${mediaId}, fileId=${media.file_id}, linkedVariants=${linkedVariantCount}]`,
      });
    } catch {
      /* audit must never break the response */
    }

    return NextResponse.json({
      ok: true,
      message:
        linkedVariantCount > 0
          ? `Image deleted and removed from ${linkedVariantCount} linked variant${linkedVariantCount === 1 ? "" : "s"}`
          : "Image deleted",
      deletedId: mediaId,
      linkedVariantCount,
      linksRemoved: linkedVariantCount,
    });
  } catch (err) {
    console.error("[PRODUCT STUDIO - MEDIA - DELETE]", err);
    return NextResponse.json(
      { error: "Could not delete the image" },
      { status: 500 },
    );
  } finally {
    conn.release();
  }
}
