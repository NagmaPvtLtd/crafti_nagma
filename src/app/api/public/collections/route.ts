import { NextRequest, NextResponse } from "next/server";
import { toNumber } from "../../../../utils/Formator/toNumber.util";
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
  display_price: number | string | null;
  display_compare_at: number | string | null;
  total_stock: number | string | null;
  variant_image: string | null;
  review_count: number | string;
  review_average: number | string | null;
}

interface CategoryRow extends RowDataPacket {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  product_count: number | string;
  thumbnail_url: string | null;
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

interface TagMatchRow extends RowDataPacket {
  product_id: string;
  name: string;
}

interface RangeRow extends RowDataPacket {
  min_price: number | string | null;
  max_price: number | string | null;
}

/* -------------------------------------------------------------------------- */
/*  SQL                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The card/listing data comes from ONE variant — the featured variant when the
 * product has one, otherwise the first variant. Its price, compare-at price and
 * first photo are what the storefront shows, per the collection brief.
 */
const PRODUCT_SELECT = `
  SELECT p.id, p.code, p.name, p.slug, p.brief_description,
         p.is_featured, p.orders_count,
         (SELECT v.price FROM product_variants v
           WHERE v.product_id = p.id AND v.status = 'active'
           ORDER BY v.is_featured DESC, v.created_at ASC, v.id ASC
           LIMIT 1)                                                   AS display_price,
         (SELECT v.compare_at_price FROM product_variants v
           WHERE v.product_id = p.id AND v.status = 'active'
           ORDER BY v.is_featured DESC, v.created_at ASC, v.id ASC
           LIMIT 1)                                                   AS display_compare_at,
         (SELECT COALESCE(SUM(v.stock), 0) FROM product_variants v
           WHERE v.product_id = p.id AND v.status = 'active'
             AND v.hide_stock = 0)                                    AS total_stock,
         (SELECT f.url FROM imagekit_files f
            JOIN product_variants v ON v.id = f.entity_id
           WHERE f.entity_type = 'product_variant'
             AND f.file_purpose = 'product_variant_image'
             AND v.product_id = p.id
           ORDER BY v.is_featured DESC, v.status = 'active' DESC,
                    f.sort_order ASC, f.created_at ASC, f.id ASC
           LIMIT 1)                                                   AS variant_image,
         (SELECT COUNT(*) FROM product_reviews r
           WHERE r.product_id = p.id AND r.is_approved = 1)           AS review_count,
         (SELECT AVG(r.rating) FROM product_reviews r
           WHERE r.product_id = p.id AND r.is_approved = 1)           AS review_average
    FROM products p
   WHERE p.status = 'active'
   ORDER BY p.is_featured DESC, p.orders_count DESC, p.created_at DESC`;

const CATEGORY_SELECT = `
  SELECT c.id, c.name, c.slug, c.parent_id,
         (SELECT COUNT(DISTINCT pc.product_id)
            FROM product_categories pc
            JOIN products p ON p.id = pc.product_id AND p.status = 'active'
           WHERE pc.category_id = c.id)                              AS product_count,
         (SELECT f.url
            FROM product_categories pc2
            JOIN products p2 ON p2.id = pc2.product_id AND p2.status = 'active'
            JOIN product_variants v2 ON v2.product_id = p2.id
            JOIN imagekit_files f ON f.entity_id = v2.id
             AND f.entity_type = 'product_variant'
             AND f.file_purpose = 'product_variant_image'
           WHERE pc2.category_id = c.id
              OR pc2.category_id IN (
                   SELECT child.id FROM categories child
                    WHERE child.parent_id = c.id
                 )
           ORDER BY p2.is_featured DESC, v2.is_featured DESC,
                    v2.status = 'active' DESC,
                    f.sort_order ASC, f.created_at ASC, f.id ASC
           LIMIT 1)                                                  AS thumbnail_url
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

const TAG_MATCH_SELECT = `
  SELECT DISTINCT ptm.product_id, t.name
    FROM product_tag_mappings ptm
    JOIN global_tags t ON t.id = ptm.tag_id
   WHERE t.name LIKE ?
  UNION
  SELECT DISTINCT v.product_id, t.name
    FROM product_variant_tag_mappings pvtm
    JOIN global_tags t   ON t.id = pvtm.tag_id
    JOIN product_variants v ON v.id = pvtm.variant_id
   WHERE t.name LIKE ?`;

const PRICE_RANGE_SELECT = `
  SELECT MIN(v.price) AS min_price, MAX(v.price) AS max_price
    FROM product_variants v
    JOIN products p ON p.id = v.product_id AND p.status = 'active'
   WHERE v.status = 'active'`;

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

/**
 * Relevance score for a search term. Ranking is deliberately strict so a weak
 * tag match can never outrank an exact product name:
 *
 *   100 exact name · 80 name prefix · 60 name contains
 *    50 exact tag  · 40 tag contains  · 30 slug/code · 20 description
 */
function relevance(
  product: CollectionProduct,
  tagNames: string[],
  term: string,
): number {
  const name = product.name.toLowerCase();
  if (name === term) return 100;
  if (name.startsWith(term)) return 80;
  if (name.includes(term)) return 60;

  const tags = tagNames.map((tag) => tag.toLowerCase());
  if (tags.some((tag) => tag === term)) return 50;
  if (tags.some((tag) => tag.includes(term))) return 40;

  if (
    product.slug.toLowerCase().includes(term) ||
    product.code.toLowerCase().includes(term)
  ) {
    return 30;
  }

  const brief = (product.briefDescription ?? "").toLowerCase();
  if (brief.includes(term)) return 20;
  return 0;
}

/**
 * Returns the public storefront catalogue: featured picks, the category tree and
 * every active product, optionally scoped, searched and price-filtered.
 *
 * @async
 * @function GET
 * @description Public route with no auth check. Every active product is read with
 *              one variant's commercial data — the featured variant first, otherwise
 *              the first variant — for the displayed price, compare-at price and
 *              cover photo, plus its combined approved-review count and average and
 *              its active-variant total stock — variants whose stock the manager hid
 *              (`hide_stock = 1`) are left out, so a product whose every visible
 *              variant is hidden reads as sold out. `?category=` / `?subcategory=` narrow
 *              the scope (a missing or `all` segment means no scoping), `?search=`
 *              (or `?q=`) matches name, slug, code, brief description, base-product
 *              tags and variant-specific tags with a strict relevance ranking, and
 *              `?minPrice=` / `?maxPrice=` filter on the displayed price. Each
 *              product gets a `/collections/<root>/<sub>/<code>` href and each root
 *              category gets a thumbnail from a product inside it.
 *
 * @param {NextRequest} req - The incoming HTTP request
 *
 * @query {string} [category] - Root category slug (lowercased); `all` or empty means no scoping
 * @query {string} [subcategory] - Subcategory slug (lowercased); takes precedence over `category`
 * @query {string} [search] - Search term (trimmed, max 120 chars); matched against names, slugs, codes, descriptions and tags
 * @query {string} [q] - Alias for `search`, used when `search` is absent
 * @query {number} [minPrice] - Minimum displayed price, inclusive (ignored when not a positive number)
 * @query {number} [maxPrice] - Maximum displayed price, inclusive (ignored when not a positive number)
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - featured: up to 8 featured products (empty when a scope is applied)
 *   - categories: the root category tree with `productCount`, `totalProductCount`, `thumbnailUrl`, `subcategories` and `href`
 *   - products: the scoped / searched / price-filtered list, each with `id`, `code`, `name`, `slug`, `briefDescription`, `isFeatured`, `imageUrl`, `priceFrom`, `priceTo`, `compareAtPrice`, `totalStock`, `reviews { average, count }`, `category`, `subcategory` and `href`
 *   - totalProducts: number of active products before scoping, search or price filters
 *   - priceRange: `{ min, max }` bounds of active variant prices across the whole catalogue
 *   - query: the search term that was served, or `null`
 *   - scope: `{ type, name, slug, found }` for a scoped request, otherwise `null`
 *
 * @throws {500} "Could not load the collections" - Database failure
 *
 * @description Workflow:
 *   1. Read and lowercase `category` and `subcategory`; read `search` (or `q`, max 120 chars) and the numeric `minPrice` / `maxPrice`
 *   2. Initialize the database pool and take a connection
 *   3. Select every active product with the featured/first variant's price and compare-at price, the total stock of active variants whose stock is not hidden, cover photo and review count/average
 *   4. Select categories with their active product counts and a thumbnail from a product inside each category
 *   5. Select product-category links joined to category and parent names
 *   6. Select the catalogue-wide active variant price bounds
 *   7. Group the links by product and map each product (preferring a subcategory link, falling back to a root link)
 *   8. When searching, load the matching tag names per product from both mapping tables
 *   9. Apply the scope: subcategory match first, otherwise root category match, building `scope` with its `found` flag
 *   10. Apply the price filter against each product's displayed price
 *   11. When searching, score each product (exact name 100, name prefix 80, name contains 60, exact tag 50, tag contains 40, slug/code 30, description 20), drop zero scores and sort by score
 *   12. Build the category tree with per-root and total product counts and subcategory hrefs
 *   13. Return 200 response with featured, categories, products, totalProducts, priceRange, query and scope
 *   14. Release the connection in `finally`
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const categorySlug = (searchParams.get("category") ?? "")
    .trim()
    .toLowerCase();
  const subcategorySlug = (searchParams.get("subcategory") ?? "")
    .trim()
    .toLowerCase();
  const search = (searchParams.get("search") ?? searchParams.get("q") ?? "")
    .trim()
    .slice(0, 120);
  const minPriceRaw = Number(searchParams.get("minPrice") ?? "");
  const maxPriceRaw = Number(searchParams.get("maxPrice") ?? "");
  const minPrice =
    Number.isFinite(minPriceRaw) && minPriceRaw > 0 ? minPriceRaw : null;
  const maxPrice =
    Number.isFinite(maxPriceRaw) && maxPriceRaw > 0 ? maxPriceRaw : null;

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const [productRows] = await conn.query<ProductRow[]>(PRODUCT_SELECT);
    const [categoryRows] = await conn.query<CategoryRow[]>(CATEGORY_SELECT);
    const [linkRows] = await conn.query<ProductCategoryRow[]>(
      PRODUCT_CATEGORY_SELECT,
    );
    const [rangeRows] = await conn.query<RangeRow[]>(PRICE_RANGE_SELECT);

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

      const price = toNumber(row.display_price);

      return {
        id: row.id,
        code: row.code,
        name: row.name,
        slug: row.slug,
        briefDescription: row.brief_description,
        isFeatured: Boolean(row.is_featured),
        imageUrl: row.variant_image ?? null,
        priceFrom: price,
        priceTo: price,
        compareAtPrice: toNumber(row.display_compare_at),
        totalStock: Number(row.total_stock ?? 0),
        reviews: {
          average: Number(row.review_average ?? 0),
          count: Number(row.review_count ?? 0),
        },
        category,
        subcategory,
        href: productHref(row.code, category, subcategory),
      };
    });

    /* ---------------- tags (only fetched when searching) ---------------- */
    const tagNamesByProduct = new Map<string, string[]>();
    const term = search.toLowerCase();

    if (term) {
      const like = `%${search}%`;
      const [tagRows] = await conn.query<TagMatchRow[]>(TAG_MATCH_SELECT, [
        like,
        like,
      ]);
      for (const row of tagRows) {
        const list = tagNamesByProduct.get(row.product_id) ?? [];
        list.push(row.name);
        tagNamesByProduct.set(row.product_id, list);
      }
    }

    /* ---------------- scope ---------------- */
    const requestedSub = subcategorySlug && subcategorySlug !== ALL_SEGMENT;
    const requestedCat = categorySlug && categorySlug !== ALL_SEGMENT;

    let scoped = products;
    let scope: CollectionsResponse["scope"] = null;

    if (requestedSub || requestedCat) {
      const match = categoryRows.find((row) =>
        requestedSub
          ? row.slug.toLowerCase() === subcategorySlug
          : row.slug.toLowerCase() === categorySlug,
      );
      scoped = products.filter((product) =>
        requestedSub
          ? product.subcategory?.slug.toLowerCase() === subcategorySlug
          : product.category?.slug.toLowerCase() === categorySlug,
      );
      scope = {
        type: requestedSub ? "subcategory" : "category",
        name: match?.name ?? (requestedSub ? subcategorySlug : categorySlug),
        slug: requestedSub ? subcategorySlug : categorySlug,
        found: Boolean(match),
      };
    }

    /* ---------------- price filter ---------------- */
    if (minPrice !== null || maxPrice !== null) {
      scoped = scoped.filter((product) => {
        const price = product.priceFrom;
        if (price === null) return false;
        if (minPrice !== null && price < minPrice) return false;
        if (maxPrice !== null && price > maxPrice) return false;
        return true;
      });
    }

    /* ---------------- search ---------------- */
    if (term) {
      scoped = scoped
        .map((product) => ({
          product,
          score: relevance(
            product,
            tagNamesByProduct.get(product.id) ?? [],
            term,
          ),
        }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((entry) => entry.product);
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
        thumbnailUrl: root.thumbnail_url ?? null,
        subcategories: children,
        href: categoryHref(root.slug),
      };
    });

    const isScoped = Boolean(requestedSub || requestedCat);
    const minCatalogue = toNumber(rangeRows[0]?.min_price) ?? 0;
    const maxCatalogue = toNumber(rangeRows[0]?.max_price) ?? 0;

    const payload: CollectionsResponse = {
      ok: true,
      featured: isScoped
        ? []
        : products.filter((product) => product.isFeatured).slice(0, 8),
      categories,
      products: scoped,
      totalProducts: products.length,
      priceRange: {
        min: Math.floor(minCatalogue),
        max: Math.ceil(maxCatalogue),
      },
      query: term ? search : null,
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
