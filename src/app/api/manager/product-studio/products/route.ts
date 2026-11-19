import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { requireManager } from "../../../../../utils/Auth/Auth.requireRole.util";
import { getPool } from "../../../../../lib/Database/main.db";
import { ProductListResponse } from "../../../../../utils/zod/product/manager.productDetail.zod";

/* -------------------------------------------------------------------------- */
/*  Row types — must extend RowDataPacket for mysql2's generic query()        */
/* -------------------------------------------------------------------------- */

interface ProductRow extends RowDataPacket {
  id: string;
  code: string;
  name: string;
  slug: string;
  status: "active" | "inactive";
  is_featured: number | boolean;
  main_showcase: number | boolean;
  created_at: string;
  updated_at: string | null;
  variant_count: number | string;
  total_stock: number | string;
  min_price: number | string | null;
  max_price: number | string | null;
  imageUrl: string | null;
}

interface TotalsRow extends RowDataPacket {
  total: number | string;
  active: number | string;
  inactive: number | string;
  without_variants: number | string;
}

interface CountRow extends RowDataPacket {
  total: number | string;
}

/* -------------------------------------------------------------------------- */
/*  GET /api/manager/product-studio/products                                  */
/*  Paginated catalogue list with the numbers the "All products" page shows.  */
/* -------------------------------------------------------------------------- */

const MAX_LIMIT = 60;

const PRODUCT_SELECT = `
  SELECT p.id, p.code, p.name, p.slug, p.status,
         p.is_featured, p.main_showcase, p.created_at, p.updated_at,
         (SELECT COUNT(*) FROM product_variants v
           WHERE v.product_id = p.id)                          AS variant_count,
         (SELECT COALESCE(SUM(v.stock), 0) FROM product_variants v
           WHERE v.product_id = p.id)                          AS total_stock,
         (SELECT MIN(v.price) FROM product_variants v
           WHERE v.product_id = p.id)                          AS min_price,
         (SELECT MAX(v.price) FROM product_variants v
           WHERE v.product_id = p.id)                          AS max_price
    FROM products p`

export async function GET(req: NextRequest) {
  const guard = await requireManager({
    label: "GET /api/manager/product-studio/products",
  });
  if (!guard.ok) return guard.response;

  const { searchParams } = req.nextUrl;

  const q = (searchParams.get("q") ?? "").trim();
  const rawStatus = searchParams.get("status");
  const status =
    rawStatus === "active" || rawStatus === "inactive" ? rawStatus : null;
  const categoryId = (searchParams.get("categoryId") ?? "").trim();

  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(searchParams.get("limit") ?? 20) || 20),
  );
  const offset = (page - 1) * limit;

  const where: string[] = [];
  const params: unknown[] = [];

  if (q) {
    const like = `%${q}%`;
    where.push("(p.name LIKE ? OR p.code LIKE ? OR p.slug LIKE ?)");
    params.push(like, like, like);
  }

  if (status) {
    where.push("p.status = ?");
    params.push(status);
  }

  if (categoryId.length >= 10) {
    where.push(
      "EXISTS (SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id AND pc.category_id = ?)",
    );
    params.push(categoryId);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query<ProductRow[]>(
      `${PRODUCT_SELECT}
       ${whereSql}
       ORDER BY COALESCE(p.updated_at, p.created_at) DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    const [countRows] = await conn.query<CountRow[]>(
      `SELECT COUNT(*) AS total FROM products p ${whereSql}`,
      params,
    );

    const [totalsRows] = await conn.query<TotalsRow[]>(
      `SELECT COUNT(*)                          AS total,
              COALESCE(SUM(status = 'active'), 0)   AS active,
              COALESCE(SUM(status = 'inactive'), 0) AS inactive,
              COALESCE(SUM(
                (SELECT COUNT(*) FROM product_variants v
                  WHERE v.product_id = p.id) = 0
              ), 0)                              AS without_variants
         FROM products p`,
    );

    const total = Number(countRows[0]?.total ?? 0);
    const t = totalsRows[0];

    const payload: ProductListResponse = {
      ok: true,
      counts: {
        total: Number(t?.total ?? 0),
        active: Number(t?.active ?? 0),
        inactive: Number(t?.inactive ?? 0),
        withoutVariants: Number(t?.without_variants ?? 0),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      products: rows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        slug: row.slug,
        status: row.status,
        isFeatured: Boolean(row.is_featured),
        mainShowcase: Boolean(row.main_showcase),
        variantCount: Number(row.variant_count ?? 0),
        totalStock: Number(row.total_stock ?? 0),
        minPrice: row.min_price === null ? null : Number(row.min_price),
        maxPrice: row.max_price === null ? null : Number(row.max_price),
        imageUrl: null,
        updatedAt: row.updated_at,
      })),
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error("[PRODUCT STUDIO - PRODUCTS - LIST - GET]", err);
    return NextResponse.json(
      { error: "Could not load the product list" },
      { status: 500 },
    );
  } finally {
    conn.release();
  }
}
