import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";

import { getPool } from "../../../../lib/Database/main.db";
import type {
  CollectionCategory,
  CollectionCategoryRef,
  CollectionProduct,
  CollectionsResponse,
} from "../../../../types/Collection.types";

/* -------------------------------------------------------------------------- */
/*  Row types — must extend RowDataPacket for mysql2's generic query()        */
/* -------------------------------------------------------------------------- */

interface ProductRow extends RowDataPacket {
  id: string;
  code: string;
  name: string;
  slug: string;
  brief_description: string | null;
  is_featured: number | boolean;
  orders_count: number | string;
  price_from: number | string | null;
  price_to: number | string | null;
  compare_at: number | string | null;
  total_stock: number | string | null;
  product_image: string | null;
  variant_image: string | null;
}

interface CategoryRow extends RowDataPacket {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  product_count: number | string;
}

interface ProductCategoryRow extends RowDataPacket {
  product_id: string;
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  parent_name: string | null;
  parent_slug: string | null;
}

/* -------------------------------------------------------------------------- */
/*  SQL                                                                      */
/* -------------------------------------------------------------------------- */

const PRODUCT_SELECT = `
  SELECT p.id, p.code, p.name, p.slug, p.brief_description,
         p.is_featured, p.orders_count,
         (SELECT MIN(v.price) FROM product_variants v
           WHERE v.product_id = p.id AND v.status = 'active')        AS price_from,
         (SELECT MAX(v.price) FROM product_variants v
           WHERE v.product_id = p.id AND v.status = 'active')        AS price_to,
         (SELECT MIN(v.compare_at_price) FROM product_variants v
           WHERE v.product_id = p.id AND v.status = 'active'
             AND v.compare_at_price IS NOT NULL)                     AS compare_at,
         (SELECT COALESCE(SUM(v.stock), 0) FROM product_variants v
           WHERE v.product_id = p.id AND v.status = 'active')        AS total_stock,
         (SELECT f.url FROM imagekit_files f
           WHERE f.entity_type = 'product' AND f.entity_id = p.id
           ORDER BY f.sort_order ASC, f.created_at ASC, f.id ASC
           LIMIT 1)                                                  AS product_image,
         (SELECT f.url FROM imagekit_files f
            JOIN product_variants v ON v.id = f.entity_id
           WHERE f.entity_type = 'product_variant'
             AND f.file_purpose = 'product_variant_image'
             AND v.product_id = p.id
           ORDER BY v.status = 'active' DESC,
                    f.sort_order ASC, f.created_at ASC, f.id ASC
           LIMIT 1)                                                  AS variant_image
    FROM products p
   WHERE p.status = 'active'
   ORDER BY p.is_featured DESC, p.orders_count DESC, p.created_at DESC`;

const CATEGORY_SELECT = `
  SELECT c.id, c.name, c.slug, c.parent_id,
         (SELECT COUNT(DISTINCT pc.product_id)
            FROM product_categories pc
            JOIN products p ON p.id = pc.product_id AND p.status = 'active'
           WHERE pc.category_id = c.id)                              AS product_count
    FROM categories c
   ORDER BY c.name ASC`;

const PRODUCT_CATEGORY_SELECT = `
  SELECT pc.product_id,
         c.id, c.name, c.slug, c.parent_id,
         par.name AS parent_name, par.slug AS parent_slug
    FROM product_categories pc
    JOIN categories c ON c.id = pc.category_id
    LEFT JOIN categories par ON par.id = c.parent_id
    JOIN products p ON p.id = pc.product_id AND p.status = 'active'
   ORDER BY c.name ASC`;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                  */
/* -------------------------------------------------------------------------- */

const ALL_SEGMENT = "all";

function productHref(
  code: string,
  category: CollectionCategoryRef | null,
  subcategory: CollectionCategoryRef | null,
): string {
  const rootSlug = category?.slug ?? ALL_SEGMENT;
  const subSlug = subcategory?.slug ?? ALL_SEGMENT;
  return `/collections/${rootSlug}/${subSlug}/${encodeURIComponent(code)}`;
}

function categoryHref(slug: string): string {
  return `/collections/${slug}`;
}

function subcategoryHref(rootSlug: string, subSlug: string): string {
  return `/collections/${rootSlug}/${subSlug}`;
}

function toNumber(value: number | string | null): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/* -------------------------------------------------------------------------- */
/*  GET /api/public/collections                                              */
/*  Public storefront data: featured picks, the category tree, and every      */
/*  active product. `?category=` / `?subcategory=` narrow to one scope.      */
/* -------------------------------------------------------------------------- */

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const categorySlug = (searchParams.get("category") ?? "").trim().toLowerCase();
  const subcategorySlug = (
    searchParams.get("subcategory") ?? ""
  ).trim().toLowerCase();

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const [productRows] = await conn.query<ProductRow[]>(PRODUCT_SELECT);
    const [categoryRows] = await conn.query<CategoryRow[]>(CATEGORY_SELECT);
    const [linkRows] = await conn.query<ProductCategoryRow[]>(
      PRODUCT_CATEGORY_SELECT,
    );

    /* product id → its category links */
    const linksByProduct = new Map<string, ProductCategoryRow[]>();
    for (const link of linkRows) {
      const list = linksByProduct.get(link.product_id) ?? [];
      list.push(link);
      linksByProduct.set(link.product_id, list);
    }

    const products: CollectionProduct[] = productRows.map((row) => {
      const links = linksByProduct.get(row.id) ?? [];
      const subLink = links.find((link) => link.parent_id !== null) ?? null;
      const rootLink = links.find((link) => link.parent_id === null) ?? null;

      let category: CollectionCategoryRef | null = null;
      let subcategory: CollectionCategoryRef | null = null;

      if (subLink) {
        subcategory = {
          id: subLink.id,
          name: subLink.name,
          slug: subLink.slug,
        };
        category = {
          id: subLink.parent_id ?? "",
          name: subLink.parent_name ?? "",
          slug: subLink.parent_slug ?? "",
        };
      } else if (rootLink) {
        category = {
          id: rootLink.id,
          name: rootLink.name,
          slug: rootLink.slug,
        };
      }

      return {
        id: row.id,
        code: row.code,
        name: row.name,
        slug: row.slug,
        briefDescription: row.brief_description,
        isFeatured: Boolean(row.is_featured),
        imageUrl: row.product_image ?? row.variant_image ?? null,
        priceFrom: toNumber(row.price_from),
        priceTo: toNumber(row.price_to),
        compareAtPrice: toNumber(row.compare_at),
        totalStock: Number(row.total_stock ?? 0),
        category,
        subcategory,
        href: productHref(row.code, category, subcategory),
      };
    });

    /* ---------------- scope ---------------- */
    const requestedSub = subcategorySlug && subcategorySlug !== ALL_SEGMENT;
    const requestedCat = categorySlug && categorySlug !== ALL_SEGMENT;

    let scoped = products;
    let scope: CollectionsResponse["scope"] = null;

    if (requestedSub) {
      const match = categoryRows.find(
        (row) => row.slug.toLowerCase() === subcategorySlug,
      );
      scoped = products.filter(
        (product) =>
          product.subcategory?.slug.toLowerCase() === subcategorySlug,
      );
      scope = {
        type: "subcategory",
        name: match?.name ?? subcategorySlug,
        slug: subcategorySlug,
        found: Boolean(match),
      };
    } else if (requestedCat) {
      const match = categoryRows.find(
        (row) => row.slug.toLowerCase() === categorySlug,
      );
      scoped = products.filter(
        (product) => product.category?.slug.toLowerCase() === categorySlug,
      );
      scope = {
        type: "category",
        name: match?.name ?? categorySlug,
        slug: categorySlug,
        found: Boolean(match),
      };
    }

    /* ---------------- category tree ---------------- */
    const roots = categoryRows.filter((row) => row.parent_id === null);
    const categories: CollectionCategory[] = roots.map((root) => {
      const children = categoryRows
        .filter((row) => row.parent_id === root.id)
        .map((child) => ({
          id: child.id,
          name: child.name,
          slug: child.slug,
          productCount: Number(child.product_count ?? 0),
          href: subcategoryHref(root.slug, child.slug),
        }));

      const own = Number(root.product_count ?? 0);
      const total = children.reduce(
        (sum, child) => sum + child.productCount,
        own,
      );

      return {
        id: root.id,
        name: root.name,
        slug: root.slug,
        productCount: own,
        totalProductCount: total,
        subcategories: children,
        href: categoryHref(root.slug),
      };
    });

    const isScoped = Boolean(requestedSub || requestedCat);

    const payload: CollectionsResponse = {
      ok: true,
      featured: isScoped
        ? []
        : products.filter((product) => product.isFeatured).slice(0, 8),
      categories,
      products: scoped,
      totalProducts: products.length,
      scope,
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error("[PUBLIC - COLLECTIONS - GET]", err);
    return NextResponse.json(
      { error: "Could not load the collections" },
      { status: 500 },
    );
  } finally {
    conn.release();
  }
}
