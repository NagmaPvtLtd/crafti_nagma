import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import {
  VariantDetailResponse,
  variantUpdateSchema,
} from "../../../../../../../utils/zod/product/manager.productDetail.zod";
import { requireManager } from "../../../../../../../utils/Auth/Auth.requireRole.util";
import { getPool } from "../../../../../../../lib/Database/main.db";
import { getCurrentDateTime } from "../../../../../../../utils/ValueFetcher/getDateTime.util";
import { auditLog } from "../../../../../../../services/AuditLog.service";

/* -------------------------------------------------------------------------- */
/*  Row types — must extend RowDataPacket for mysql2's generic query()        */
/* -------------------------------------------------------------------------- */

interface VariantRow extends RowDataPacket {
  id: string;
  product_id: string;
  product_name: string;
  product_code: string;
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
  file_id: string;
  url: string;
  alt_text: string | null;
  sort_order: number | string;
  created_at: string;
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

async function loadVariant(
  conn: PoolConnection,
  productId: string,
  variantId: string,
) {
  const [rows] = await conn.query<VariantRow[]>(
    `SELECT v.id, v.product_id,
            p.name AS product_name, p.code AS product_code,
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
              f.file_id,
              f.url,
              f.alt_text,
              f.sort_order,
              f.created_at
       FROM imagekit_files f
      WHERE f.file_purpose = 'product_variant_image'
        AND f.entity_type = 'product_variant'
        AND f.entity_id = ?
      ORDER BY f.sort_order ASC, f.created_at ASC`,
    [variantId],
  );

  return rows.map((m) => ({
    id: m.id,
    url: m.url,
    fileId: m.file_id,
    altText: m.alt_text ?? "",
    sortOrder: Number(m.sort_order ?? 0),
    variantId,
    createdAt: m.created_at ?? null,
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

  const { id, variantId } = await params;
  if (!id || id.length < 10 || !variantId || variantId.length < 10) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const variant = await loadVariant(conn, id, variantId);
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

    const media = await loadMedia(conn, id, variantId);
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

  const { id, variantId } = await params;
  if (!id || id.length < 10 || !variantId || variantId.length < 10) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
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
    const variant = await loadVariant(conn, id, variantId);
    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    const now = getCurrentDateTime();

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
        id,
      ],
    );

    await conn.query(
      `UPDATE products SET updated_by = ?, updated_at = ? WHERE id = ?`,
      [managerId, now, id],
    );

    try {
      await auditLog.log(pool, {
        userId: managerId,
        action: "UPDATE",
        entityType: "VARIANT",
        entityId: variantId,
        description: `Variant updated. [id=${variantId}, sku=${variant.sku}, price=${data.price}, stock=${data.stock}, status=${data.status}]`,
      });
    } catch {
      /* audit must never break the response */
    }

    return NextResponse.json({
      ok: true,
      message: "Variant updated",
      variant: {
        id: variantId,
        price: data.price,
        stock: data.stock,
        status: data.status,
      },
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
