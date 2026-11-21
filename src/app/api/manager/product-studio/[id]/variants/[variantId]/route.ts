import { NextRequest, NextResponse } from "next/server";
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

function invalidInput(details: Record<string, string[]>) {
  return NextResponse.json(
    { error: "Validation failed", details },
    { status: 400 },
  );
}

function isDuplicateEntry(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "ER_DUP_ENTRY"
  );
}

async function resolveProductId(
  conn: PoolConnection,
  productRef: string,
): Promise<string | null> {
  const [rows] = await conn.query<IdRow[]>(
    `SELECT id FROM products WHERE id = ? OR code = ? LIMIT 1`,
    [productRef, productRef],
  );
  return rows[0]?.id ?? null;
}

async function resolveVariantId(
  conn: PoolConnection,
  productId: string,
  variantRef: string,
): Promise<string | null> {
  const [rows] = await conn.query<IdRow[]>(
    `SELECT id FROM product_variants
      WHERE product_id = ? AND (id = ? OR sku = ?)
      LIMIT 1`,
    [productId, variantRef, variantRef],
  );
  return rows[0]?.id ?? null;
}

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

/* -------------------------------------------------------------------------- */
/*  GET /api/manager/product-studio/[id]/variants/[variantId]                 */
/* -------------------------------------------------------------------------- */

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
        if (originalImageIds.length > 0) {
          await conn.query(
            `DELETE FROM imagekit_files WHERE source_image_id IN (?)`,
            [originalImageIds],
          );
        }

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
        description: `Variant updated. [id=${variantId}, sku=${variant.sku}, price=${data.price}, stock=${data.stock}, status=${data.status}${disabling ? `, removedImages=${removedImages}` : ""}]`,
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
    try {
      if (originalImageIds.length > 0) {
        await conn.query(
          `DELETE FROM imagekit_files WHERE source_image_id IN (?)`,
          [originalImageIds],
        );
      }
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
        description: `Variant deleted. [id=${variantId}, sku=${variant.sku}, productId=${productId}, images=${fileRows.length}]`,
      });
    } catch {
      /* audit must never break the response */
    }

    return NextResponse.json({
      ok: true,
      message: "Variant deleted",
      deletedId: variantId,
      deletedImages: fileRows.length,
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
