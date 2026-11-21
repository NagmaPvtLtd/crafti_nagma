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

/**
 * Returns a paginated, filterable product catalogue list for the "All products" page.
 *
 * @async
 * @function GET
 * @description Filters `products` by free text (name, code or slug), status and category, then
 *              paginates newest-updated first with per-product variant count, total stock and
 *              price range. Table-wide counts are returned alongside the page so the stat strip
 *              stays accurate while filters are applied. `imageUrl` is always `null` in this
 *              payload.
 *
 * @param {NextRequest} req - The incoming HTTP request
 * @query {string} [q] - Free text matched against `p.name`, `p.code` and `p.slug`
 * @query {string} [status] - `active` or `inactive`; any other value is ignored
 * @query {string} [categoryId] - Category id filter, applied through `product_categories` only
 *                               when it is at least 10 characters long
 * @query {number} [page] - Page number (default: 1)
 * @query {number} [limit] - Page size (default: 20, max: 60)
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - counts: `total`, `active`, `inactive`, `withoutVariants`
 *   - pagination: `page`, `limit`, `total` and `totalPages`
 *   - products: each with `id`, `code`, `name`, `slug`, `status`, `isFeatured`, `mainShowcase`,
 *               `variantCount`, `totalStock`, `minPrice`, `maxPrice`, `imageUrl` and `updatedAt`
 *
 * @throws {401} Unauthorized - No session
 * @throws {403} Forbidden - Account not active, no role, or role below manager
 * @throws {500} "Could not load the product list" - Database failure
 *
 * @description Workflow:
 *   1. Initialize the manager guard (session, active status, role rank)
 *   2. Read `q`, `status`, `categoryId`, `page` and `limit` from the query string
 *   3. Clamp `page` to 1+ and `limit` to 1-60 (default 20)
 *   4. Compute `offset` from page and limit
 *   5. Build the `WHERE` list: LIKE across name/code/slug, exact status, category EXISTS
 *   6. Initialize the database pool and take a connection
 *   7. Select the page slice with variant count, total stock and price range subqueries
 *   8. Count the filtered rows
 *   9. Count table-wide totals including products without variants
 *   10. Normalize the aggregates and return 200 with counts, pagination and products
 *   11. Release the connection in `finally`
 */
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
