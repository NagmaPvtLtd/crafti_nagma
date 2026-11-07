import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "../../../../../utils/Auth/Auth.requireRole.util";
import { getPool } from "../../../../../lib/Database/main.db";
import { getCurrentDateTime } from "../../../../../utils/ValueFetcher/getDateTime.util";
import { auditLog } from "../../../../../services/AuditLog.service";
import { randomUUID } from "crypto";
import { productCreateSchema } from "../../../../../utils/zod/manager.product.zod";

/* -------------------------------------------------------------------------- */
/*  GET /api/manager/products                                                 */
/* -------------------------------------------------------------------------- */

type ProductListRow = {
  id: string;
  code: string;
  name: string;
  slug: string;
  brief_description: string | null;
  status: "active" | "inactive";
  is_featured: number | boolean;
  main_showcase: number | boolean;
  orders_count: number | string;
  created_at: string;
  updated_at: string | null;
  variant_count: number | string;
  min_price: number | string | null;
  max_price: number | string | null;
  total_stock: number | string;
};

export async function GET(req: NextRequest) {
  const guard = await requireRole(["manager", "admin", "super_admin"], {
    label: "GET /api/manager/products",
  });
  if (!guard.ok) return guard.response;

  /* ---- query params ---- */
  const sp = req.nextUrl.searchParams;
  const search = (sp.get("search") ?? "").trim();
  const status = sp.get("status") ?? ""; // "active" | "inactive" | ""
  const featured = sp.get("featured") === "1";
  const categoryId = (sp.get("category_id") ?? "").trim();
  const page = Math.max(1, Number(sp.get("page") ?? "1") || 1);
  const limit = Math.min(
    50,
    Math.max(1, Number(sp.get("limit") ?? "20") || 20),
  );
  const offset = (page - 1) * limit;

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    /* ---- build WHERE clause safely ---- */
    const where: string[] = [];
    const params: unknown[] = [];

    if (search) {
      where.push("(p.name LIKE ? OR p.code LIKE ? OR p.slug LIKE ?)");
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    if (status === "active" || status === "inactive") {
      where.push("p.status = ?");
      params.push(status);
    }
    if (featured) {
      where.push("p.is_featured = 1");
    }
    if (categoryId) {
      where.push(
        `EXISTS (SELECT 1 FROM product_categories pc
                  WHERE pc.product_id = p.id AND pc.category_id = ?)`,
      );
      params.push(categoryId);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    /* ---- count ---- */
    const [countRows] = await conn.query<{ total: number | string }[]>(
      `SELECT COUNT(*) AS total
         FROM products p
         ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total ?? 0);

    /* ---- list ---- */
    const [rows] = await conn.query<ProductListRow[]>(
      `SELECT p.id, p.code, p.name, p.slug,
              p.brief_description, p.status,
              p.is_featured, p.main_showcase, p.orders_count,
              p.created_at, p.updated_at,
              (SELECT COUNT(*) FROM product_variants v
                 WHERE v.product_id = p.id)                AS variant_count,
              (SELECT MIN(price) FROM product_variants v
                 WHERE v.product_id = p.id)                AS min_price,
              (SELECT MAX(price) FROM product_variants v
                 WHERE v.product_id = p.id)                AS max_price,
              (SELECT COALESCE(SUM(stock), 0)
                 FROM product_variants v
                WHERE v.product_id = p.id)                 AS total_stock
         FROM products p
         ${whereSql}
     ORDER BY COALESCE(p.updated_at, p.created_at) DESC
        LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    return NextResponse.json({
      ok: true,
      query: { search, status, featured, categoryId, page, limit },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      products: rows.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        slug: r.slug,
        briefDescription: r.brief_description ?? "",
        status: r.status,
        isFeatured: Boolean(r.is_featured),
        mainShowcase: Boolean(r.main_showcase),
        ordersCount: Number(r.orders_count ?? 0),
        variantCount: Number(r.variant_count ?? 0),
        minPrice: r.min_price === null ? null : Number(r.min_price),
        maxPrice: r.max_price === null ? null : Number(r.max_price),
        totalStock: Number(r.total_stock ?? 0),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    });
  } catch (err) {
    console.error("[PRODUCTS - LIST - GET]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  } finally {
    conn.release();
  }
}

/* -------------------------------------------------------------------------- */
/*  POST /api/manager/products                                                */
/* -------------------------------------------------------------------------- */

export async function POST(req: NextRequest) {
  const guard = await requireRole(["manager", "admin", "super_admin"], {
    label: "POST /api/manager/products",
  });
  if (!guard.ok) return guard.response;

  const managerId = guard.session.user.id;
  if (!managerId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  /* ---- input ---- */
  const json = await req.json().catch(() => null);
  const parsed = productCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_input",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    /* ---- slug uniqueness pre-check ---- */
    const [slugTaken] = await conn.query<{ id: string }[]>(
      `SELECT id FROM products WHERE slug = ? LIMIT 1`,
      [data.slug],
    );
    if (slugTaken.length > 0) {
      await conn.rollback();
      return NextResponse.json(
        { error: "invalid_input", details: { slug: ["Slug already in use"] } },
        { status: 400 },
      );
    }

    /* ---- code uniqueness pre-check ---- */
    const [codeTaken] = await conn.query<{ id: string }[]>(
      `SELECT id FROM products WHERE code = ? LIMIT 1`,
      [data.code],
    );
    if (codeTaken.length > 0) {
      await conn.rollback();
      return NextResponse.json(
        { error: "invalid_input", details: { code: ["Code already in use"] } },
        { status: 400 },
      );
    }

    /* ---- category FK sanity ---- */
    if (data.categoryIds.length > 0) {
      const [catRows] = await conn.query<{ id: string }[]>(
        `SELECT id FROM categories WHERE id IN (?)`,
        [data.categoryIds],
      );
      if (catRows.length !== data.categoryIds.length) {
        await conn.rollback();
        return NextResponse.json(
          {
            error: "invalid_input",
            details: { categoryIds: ["One or more categories not found"] },
          },
          { status: 400 },
        );
      }
    }

    /* ---- insert product ---- */
    const productId = randomUUID().replace(/-/g, "").slice(0, 40);
    const now = getCurrentDateTime();

    await conn.query(
      `INSERT INTO products
         (id, code, name, slug,
          brief_description, description,
          meta_title, meta_description,
          delivery_charges, processing_time,
          is_featured, main_showcase, orders_count, status,
          created_by, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, NULL, ?, NULL)`,
      [
        productId,
        data.code,
        data.name,
        data.slug,
        data.briefDescription || null,
        data.description || null,
        data.metaTitle || null,
        data.metaDescription || null,
        data.deliveryCharges ?? 0,
        data.processingTime || null,
        data.isFeatured ? 1 : 0,
        data.mainShowcase ? 1 : 0,
        data.status,
        managerId,
        now,
      ],
    );

    /* ---- map categories ---- */
    if (data.categoryIds.length > 0) {
      const values = data.categoryIds.map((cid) => [productId, cid]);
      await conn.query(
        `INSERT INTO product_categories (product_id, category_id) VALUES ?`,
        [values],
      );
    }

    /* ---- optional first variant ---- */
    if (data.firstVariant) {
      const fv = data.firstVariant;
      const variantId = randomUUID().replace(/-/g, "").slice(0, 40);
      await conn.query(
        `INSERT INTO product_variants
           (id, product_id, name, description, sku,
            price, compare_at_price, stock, weight,
            sort_order, status, created_by, updated_by,
            created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'active', ?, NULL, ?, NULL)`,
        [
          variantId,
          productId,
          fv.name || null,
          fv.description || null,
          fv.sku,
          fv.price,
          fv.compareAtPrice ?? null,
          fv.stock ?? 0,
          fv.weight ?? null,
          managerId,
          now,
        ],
      );
    }

    await conn.commit();

    /* ---- audit (never break response) ---- */
    try {
      await auditLog.log(pool, {
        userId: managerId,
        action: "CREATE",
        entityType: "PRODUCT",
        entityId: productId,
        description: `Product created. [id=${productId}, code=${data.code}, name=${data.name}]`,
      });
    } catch {
      /* swallow */
    }

    return NextResponse.json({ ok: true, id: productId });
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error("[PRODUCTS - CREATE - POST]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  } finally {
    conn.release();
  }
}
