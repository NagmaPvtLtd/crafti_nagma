import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { requireManager } from "../../../../../utils/Auth/Auth.requireRole.util";
import { getPool } from "../../../../../lib/Database/main.db";

/* -------------------------------------------------------------------------- */
/*  Row types — must extend RowDataPacket for mysql2's generic query()        */
/* -------------------------------------------------------------------------- */

interface ProductCountRow extends RowDataPacket {
  total: number | string;
  active: number | string;
  inactive: number | string;
  featured: number | string;
}

interface VariantCountRow extends RowDataPacket {
  total: number | string;
  low_stock: number | string;
  out_of_stock: number | string;
}

interface CategoryCountRow extends RowDataPacket {
  total: number | string;
  root: number | string;
}

interface RecentProductRow extends RowDataPacket {
  id: string;
  name: string;
  slug: string;
  status: "active" | "inactive";
  updated_at: string;
}

interface TopProductRow extends RowDataPacket {
  id: string;
  name: string;
  units: number | string;
}

/* -------------------------------------------------------------------------- */
/*  GET /api/manager/products/overview                                        */
/* -------------------------------------------------------------------------- */

export async function GET() {
  const guard = await requireManager({
    label: "GET /api/manager/products/overview",
  });
  if (!guard.ok) return guard.response;

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    /* ---- product counts ---- */
    const [productRows] = await conn.query<ProductCountRow[]>(
      `SELECT
         COUNT(*)                     AS total,
         SUM(status = 'active')       AS active,
         SUM(status = 'inactive')     AS inactive,
         SUM(is_featured = 1)         AS featured
       FROM products`,
    );

    /* ---- variant counts ---- */
    const [variantRows] = await conn.query<VariantCountRow[]>(
      `SELECT
         COUNT(*)                          AS total,
         SUM(stock BETWEEN 1 AND 5)        AS low_stock,
         SUM(stock = 0)                    AS out_of_stock
       FROM product_variants`,
    );

    /* ---- category counts ---- */
    const [categoryRows] = await conn.query<CategoryCountRow[]>(
      `SELECT
         COUNT(*)                    AS total,
         SUM(parent_id IS NULL)      AS root
       FROM categories`,
    );

    /* ---- recently updated (for hub footer) ---- */
    const [recentRows] = await conn.query<RecentProductRow[]>(
      `SELECT id, name, slug, status, updated_at
         FROM products
        ORDER BY COALESCE(updated_at, created_at) DESC
        LIMIT 5`,
    );

    /* ---- quick stat: top product by units (last 30 days) ---- */
    const [topRows] = await conn.query<TopProductRow[]>(
      `SELECT p.id, p.name, SUM(oi.quantity) AS units
         FROM order_items oi
         JOIN orders o           ON o.id = oi.order_id
         JOIN product_variants v ON v.id = oi.variant_id
         JOIN products p         ON p.id = v.product_id
        WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          AND o.order_status NOT IN ('cancelled')
     GROUP BY p.id, p.name
     ORDER BY units DESC
        LIMIT 1`,
    );

    /* ---- normalise numeric strings → numbers ---- */
    const p = productRows[0] ?? ({} as Partial<ProductCountRow>);
    const v = variantRows[0] ?? ({} as Partial<VariantCountRow>);
    const c = categoryRows[0] ?? ({} as Partial<CategoryCountRow>);
    const top = topRows[0] ?? null;

    return NextResponse.json({
      ok: true,
      scope: "manager",
      counts: {
        products: {
          total: Number(p.total ?? 0),
          active: Number(p.active ?? 0),
          inactive: Number(p.inactive ?? 0),
          featured: Number(p.featured ?? 0),
        },
        variants: {
          total: Number(v.total ?? 0),
          lowStock: Number(v.low_stock ?? 0),
          outOfStock: Number(v.out_of_stock ?? 0),
        },
        categories: {
          total: Number(c.total ?? 0),
          root: Number(c.root ?? 0),
        },
      },
      quickStats: {
        topProduct: top
          ? {
              id: top.id,
              name: top.name,
              units: Number(top.units ?? 0),
            }
          : null,
      },
      recentlyUpdated: recentRows.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        status: r.status,
        updatedAt: r.updated_at,
      })),
    });
  } catch (err) {
    console.error("[PRODUCTS - OVERVIEW - GET]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  } finally {
    conn.release();
  }
}
