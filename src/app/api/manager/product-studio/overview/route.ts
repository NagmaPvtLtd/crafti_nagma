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

interface OptionCountRow extends RowDataPacket {
  total: number | string;
}

interface RecentProductRow extends RowDataPacket {
  id: string;
  code: string;
  name: string;
  slug: string;
  status: "active" | "inactive";
  updated_at: string;
  product_image: string | null;
  variant_image: string | null;
}

interface TopProductRow extends RowDataPacket {
  id: string;
  name: string;
  units: number | string;
}

/* -------------------------------------------------------------------------- */
/*  GET /api/manager/product-studio/overview                                        */
/* -------------------------------------------------------------------------- */

/**
 * Returns the Product Studio hub numbers: product, variant, category and option counts plus
 * recent activity.
 *
 * @async
 * @function GET
 * @description Read-only aggregate view behind the manager guard. Product totals split by
 *              status and featured flag, variants split into low stock (1-5) and out of stock
 *              (0), category totals with the root count, the global option pool size, the five
 *              most recently updated products and the top product by units sold in the last 30
 *              days (cancelled orders excluded).
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - scope: `manager`
 *   - counts: `products` (`total`, `active`, `inactive`, `featured`), `variants` (`total`,
 *             `lowStock`, `outOfStock`), `categories` (`total`, `root`), `options` (`total`)
 *   - quickStats: `topProduct` (`id`, `name`, `units`) or `null`
 *   - recentlyUpdated: up to 5 products with `id`, `code`, `name`, `slug`, `status`, `updatedAt`
 *     and `imageUrl` (product-level cover first, else the first variant photo)
 *
 * @throws {401} Unauthorized - No session
 * @throws {403} Forbidden - Account not active, no role, or role below manager
 * @throws {500} `server_error` - Database failure while aggregating products, variants,
 *               categories, options or order items
 *
 * @description Workflow:
 *   1. Initialize the manager guard (session, active status, role rank)
 *   2. Initialize the database pool and take a connection
 *   3. Count products by status and featured flag
 *   4. Count variants, low stock and out of stock
 *   5. Count categories and root categories
 *   6. Count global options
 *   7. Select the 5 most recently updated products with their cover image — the product-level
 *      image first, else the first variant photo (active variants preferred), the same
 *      preference the "All products" list and the storefront cards use
 *   8. Select the top product by units from the last 30 days, cancelled orders excluded
 *   9. Normalize MySQL aggregates with `Number`
 *   10. Return 200 response with counts, `quickStats` and `recentlyUpdated`
 *   11. Release the connection in `finally`
 */
export async function GET() {
  const guard = await requireManager({
    label: "GET /api/manager/product-studio/overview",
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

    /* ---- global option pool count ---- */
    const [optionRows] = await conn.query<OptionCountRow[]>(
      `SELECT COUNT(*) AS total FROM global_options`,
    );

    /* ---- recently updated (for hub footer) ---- */
    const [recentRows] = await conn.query<RecentProductRow[]>(
      `SELECT p.id, p.code, p.name, p.slug, p.status, p.updated_at,
              (SELECT f.url FROM imagekit_files f
                WHERE f.entity_type = 'product' AND f.entity_id = p.id
                ORDER BY f.sort_order ASC, f.created_at ASC, f.id ASC
                LIMIT 1)                                          AS product_image,
              (SELECT f.url FROM imagekit_files f
                 JOIN product_variants v ON v.id = f.entity_id
                WHERE f.entity_type = 'product_variant'
                  AND f.file_purpose = 'product_variant_image'
                  AND v.product_id = p.id
                ORDER BY v.status = 'active' DESC,
                         f.sort_order ASC, f.created_at ASC, f.id ASC
                LIMIT 1)                                          AS variant_image
         FROM products p
        ORDER BY COALESCE(p.updated_at, p.created_at) DESC
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
    const o = optionRows[0] ?? ({} as Partial<OptionCountRow>);
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
        options: {
          total: Number(o.total ?? 0),
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
        code: r.code,
        name: r.name,
        slug: r.slug,
        status: r.status,
        updatedAt: r.updated_at,
        imageUrl: r.product_image ?? r.variant_image ?? null,
      })),
    });
  } catch (err) {
    console.error("[PRODUCT STUDIO - OVERVIEW - GET]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  } finally {
    conn.release();
  }
}
