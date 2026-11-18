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
  file_id: string;
  url: string;
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
  const productId = String(form.get("productId") ?? "").trim();
  const rawVariantId = String(form.get("variantId") ?? "").trim();
  const variantId = rawVariantId || null;
  const altText = String(form.get("altText") ?? "").trim();

  if (productId.length < 10 || productId.length > 40) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }
  if (!variantId || variantId.length < 10 || variantId.length > 40) {
    return NextResponse.json(
      { error: "variantId is required — base products do not have images" },
      { status: 400 },
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

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const [productRows] = await conn.query<IdRow[]>(
      `SELECT id FROM products WHERE id = ? LIMIT 1`,
      [productId],
    );
    if (!productRows[0]) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (variantId) {
      const [variantRows] = await conn.query<IdRow[]>(
        `SELECT id FROM product_variants WHERE id = ? AND product_id = ? LIMIT 1`,
        [variantId, productId],
      );
      if (!variantRows[0]) {
        return NextResponse.json(
          { error: "Variant not found for this product" },
          { status: 404 },
        );
      }
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
      `SELECT f.id AS image_id, f.file_id, f.url
         FROM imagekit_files f
        WHERE f.id = ? AND f.file_purpose = 'product_variant_image'
        LIMIT 1`,
      [mediaId],
    );
    const media = rows[0];
    if (!media) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    await ImageKitService.deleteFile(media.file_id);

    await conn.query(`DELETE FROM imagekit_files WHERE id = ?`, [
      media.image_id,
    ]);

    try {
      await auditLog.log(pool, {
        userId: managerId,
        action: "FILE_DELETED",
        entityType: "IMAGEKIT_FILE",
        entityId: media.image_id,
        description: `Product image deleted. [mediaId=${mediaId}, fileId=${media.file_id}]`,
      });
    } catch {
      /* audit must never break the response */
    }

    return NextResponse.json({
      ok: true,
      message: "Image deleted",
      deletedId: mediaId,
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
