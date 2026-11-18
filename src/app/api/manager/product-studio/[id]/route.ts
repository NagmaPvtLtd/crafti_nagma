import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { auditLog } from "../../../../../services/AuditLog.service";
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
  is_featured: number | boolean;
  main_showcase: number | boolean;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string | null;
}

interface CategoryRow extends RowDataPacket {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
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
  url: string;
  alt_text: string | null;
  variant_id: string;
  sort_order: number | string;
  created_at: string;
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

/* -------------------------------------------------------------------------- */
/*  GET /api/manager/product-studio/[id]                                      */
/*  Everything the product overview page needs, in one round trip.            */
/* -------------------------------------------------------------------------- */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireManager({
    label: "GET /api/manager/product-studio/[id]",
  });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!id || id.length < 10) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const [productRows] = await conn.query<ProductRow[]>(
      `SELECT id, code, name, slug,
              brief_description, description,
              meta_title, meta_description,
              delivery_charges, is_featured, main_showcase, status,
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
      `SELECT id, name, sku, price, compare_at_price, stock, status
         FROM product_variants
        WHERE product_id = ?
        ORDER BY created_at ASC, id ASC`,
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
              f.url,
              f.alt_text,
              f.entity_id AS variant_id,
              f.sort_order,
              f.created_at
         FROM imagekit_files f
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

    const firstImageByVariant = new Map<string, string>();
    for (const row of mediaRows) {
      if (!firstImageByVariant.has(row.variant_id)) {
        firstImageByVariant.set(row.variant_id, row.url);
      }
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
        isFeatured: Boolean(product.is_featured),
        mainShowcase: Boolean(product.main_showcase),
        status: product.status,
        createdAt: product.created_at,
        updatedAt: product.updated_at,
      },
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
        imageUrl: firstImageByVariant.get(v.id) ?? null,
      })),
      media: mediaRows.map((m) => ({
        id: m.id,
        url: m.url,
        fileId: m.id,
        altText: m.alt_text ?? "",
        sortOrder: Number(m.sort_order ?? 0),
        variantId: m.variant_id,
        createdAt: m.created_at,
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
/*  Edit the base product. `code` and `slug` stay stable; categories are      */
/*  replaced only when `categoryIds` is sent.                                 */
/* -------------------------------------------------------------------------- */

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

  const { id } = await params;
  if (!id || id.length < 10) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
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
    const [existingRows] = await conn.query<ProductRow[]>(
      `SELECT id, code, name, slug, status FROM products WHERE id = ? LIMIT 1`,
      [id],
    );
    if (!existingRows[0]) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

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

    const now = getCurrentDateTime();
    await conn.beginTransaction();

    await conn.query(
      `UPDATE products
          SET name = ?,
              brief_description = ?,
              description = ?,
              meta_title = ?,
              meta_description = ?,
              delivery_charges = ?,
              is_featured = ?,
              main_showcase = ?,
              status = ?,
              updated_by = ?,
              updated_at = ?
        WHERE id = ?`,
      [
        data.name,
        data.briefDescription || null,
        data.description || null,
        data.metaTitle || null,
        data.metaDescription || null,
        data.deliveryCharges,
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

    await conn.commit();

    try {
      await auditLog.log(pool, {
        userId: managerId,
        action: "UPDATE",
        entityType: "PRODUCT",
        entityId: id,
        description: `Base product updated. [id=${id}, name=${data.name}, status=${data.status}, categories=${categoryIds ? categoryIds.length : "unchanged"}]`,
      });
    } catch {
      /* audit must never break the response */
    }

    return NextResponse.json({
      ok: true,
      message: "Product updated",
      product: {
        id,
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
        name: ["A product with this name already exists — try another"],
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
