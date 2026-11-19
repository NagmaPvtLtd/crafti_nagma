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
/*  DELETE /api/manager/product-studio/media?id=<imagekit_files.id>            */
/*  Removes the ImageKit file and its database rows.                          */
/* -------------------------------------------------------------------------- */

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
      await conn.query(
        `DELETE FROM imagekit_files WHERE source_image_id = ?`,
        [media.image_id],
      );
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
