import { NextRequest, NextResponse } from "next/server";
import { toNumber } from "../../../../../utils/Formator/toNumber.util";
import type { RowDataPacket } from "mysql2";

import { getPool } from "../../../../../lib/Database/main.db";
import type {
  CollectionCategoryRef,
  CollectionOption,
  CollectionProductDetail,
  CollectionProductImage,
  CollectionProductResponse,
  CollectionVariant,
  CollectionVariantRef,
} from "../../../../../types/Collection.types";

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
  processing_time: string | null;
  delivery_charges: number | string | null;
  length: number | string | null;
  width: number | string | null;
  height: number | string | null;
  dimension_unit: "cm" | "in" | null;
  is_featured: number | boolean;
}

interface ImageRow extends RowDataPacket {
  id: string;
  url: string;
  alt_text: string | null;
}

interface VariantRefRow extends RowDataPacket {
  id: string;
  sku: string;
  stock: number | string;
  status: "active" | "inactive";
  is_featured: number | boolean;
}

interface VariantRow extends RowDataPacket {
  id: string;
  sku: string;
  name: string | null;
  brief_description: string | null;
  description: string | null;
  price: number | string;
  compare_at_price: number | string | null;
  stock: number | string;
  weight: number | string | null;
  length: number | string | null;
  width: number | string | null;
  height: number | string | null;
  dimension_unit: "cm" | "in" | null;
  status: "active" | "inactive";
  is_featured: number | boolean;
}

interface FeatureRow extends RowDataPacket {
  id: string;
  feature: string;
}

interface CareRow extends RowDataPacket {
  id: string;
  instruction: string;
}

interface GiftRow extends RowDataPacket {
  id: string;
  item: string;
}

interface OptionRow extends RowDataPacket {
  id: string;
  name: string;
}

interface OptionValueRow extends RowDataPacket {
  id: string;
  option_id: string;
  value: string;
}

interface VariantValueRow extends RowDataPacket {
  variant_id: string;
  option_value_id: string;
}

interface ReviewRow extends RowDataPacket {
  review_count: number | string;
  review_average: number | string | null;
}

interface CategoryLinkRow extends RowDataPacket {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  parent_name: string | null;
  parent_slug: string | null;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                  */
/* -------------------------------------------------------------------------- */

const ALL_SEGMENT = "all";


/* -------------------------------------------------------------------------- */
/*  GET /api/public/collections/product?code=<code>&variant=<sku>             */
/*                                                                            */
/*  Only ONE variant's full data is loaded per request — the one named by     */
/*  `variant` (its SKU, or its id), falling back to the product's default.    */
/*  `variants` ships just the SKU skeleton (id, SKU, status, option values)   */
/*  so the option chips know which SKU to ask for next; changing a value      */
/*  triggers a fresh request for that SKU instead of shipping every variant.  */
/* -------------------------------------------------------------------------- */

/**
 * Returns one active storefront product with exactly one variant loaded in full.
 *
 * @async
 * @function GET
 * @description Public route with no auth check. The product is resolved by code, slug or id.
 *              Only the variant named by `?variant=` (its SKU or id) is loaded in full; without
 *              it the featured active variant is chosen (the one the collection card shows),
 *              then the first active variant with stock, then any active variant, then the first
 *              variant. `variants` ships the SKU skeleton (id, SKU, status and option
 *              value ids) so changing an option chip can request that SKU instead. A variant with
 *              no photos falls back to the product-level gallery.
 *
 * @param {NextRequest} req - The incoming HTTP request
 * @query {string} code - Product code, slug or id (required, max 120 chars)
 * @query {string} [variant] - Variant SKU or id to load in full (max 120 chars)
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - product: `id`, `code`, `name`, `slug`, `briefDescription`, `description`, `processingTime`,
 *              `deliveryCharges`, `isFeatured`, `images`, `options`, `reviews` (average, count),
 *              `features`, `careInstructions`, `giftIncluded`, `category`, `subcategory`, `href`
 *   - variant: the selected variant with copy, `price`, `compareAtPrice`, `stock`, `weight`,
 *              `status`, `isFeatured`, `images` and `optionValueIds`, or `null`
 *   - variants: the SKU skeleton of every variant (`id`, `sku`, `status`, `optionValueIds`)
 *
 * @throws {400} Missing `code`, or a `code` / `variant` reference longer than 120 chars
 * @throws {404} "Product not found" - No active product matches the reference
 * @throws {500} "Could not load this product" - Database failure
 *
 * @description Workflow:
 *   1. Read `code` and `variant` from the query string and length-check both
 *   2. Initialize the database pool and take a connection
 *   3. Resolve the active product by code, slug or id, returning 404 when missing
 *   4. Load the product-level images in sort order
 *   5. Load the SKU skeleton of every variant (active first, then cheapest)
 *   6. Load the product's options and option values
 *   7. Load the variant/value links and group them by variant
 *   8. Load features, care instructions and included gifts
 *   9. Load approved review count and average
 *   10. Load the product's category links with parent names
 *   11. Build the options list, dropping options without values
 *   12. Choose the variant: requested SKU/id, else the featured active variant, else first active
 *       in stock, else first active, else the first variant
 *   13. Load that variant in full plus its photos, falling back to the product gallery
 *   14. Build the category and subcategory refs and the product `href`
 *   15. Return 200 response with product, variant and variants
 *   16. Release the connection in `finally`
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const ref = (searchParams.get("code") ?? "").trim();
  const variantRef = (searchParams.get("variant") ?? "").trim();

  if (!ref || ref.length > 120) {
    return NextResponse.json(
      { error: "A product code is required" },
      { status: 400 },
    );
  }

  if (variantRef.length > 120) {
    return NextResponse.json(
      { error: "That variant reference is not valid" },
      { status: 400 },
    );
  }

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const [productRows] = await conn.query<ProductRow[]>(
      `SELECT p.id, p.code, p.name, p.slug, p.brief_description, p.description,
              p.processing_time, p.delivery_charges,
              p.length, p.width, p.height, p.dimension_unit,
              p.is_featured
         FROM products p
        WHERE p.status = 'active'
          AND (p.code = ? OR p.slug = ? OR p.id = ?)
        LIMIT 1`,
      [ref, ref, ref],
    );

    const row = productRows[0];
    if (!row) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 },
      );
    }

    /* Product-level photos — the fallback gallery when a variant has none. */
    const [productImages] = await conn.query<ImageRow[]>(
      `SELECT f.id, f.url, f.alt_text
         FROM imagekit_files f
        WHERE f.entity_type = 'product' AND f.entity_id = ?
        ORDER BY f.sort_order ASC, f.created_at ASC, f.id ASC`,
      [row.id],
    );

    /* The SKU skeleton for every variant — no copy, no price, no photos.
       Featured first, because the collection card shows that variant's photo
       and price, so opening the product must land on the same variant. */
    const [variantRefRows] = await conn.query<VariantRefRow[]>(
      `SELECT v.id, v.sku, v.stock, v.status, v.is_featured
         FROM product_variants v
        WHERE v.product_id = ?
        ORDER BY v.is_featured DESC, v.status = 'active' DESC,
                 v.created_at ASC, v.id ASC`,
      [row.id],
    );

    const [optionRows] = await conn.query<OptionRow[]>(
      `SELECT o.id, o.name
         FROM product_options o
        WHERE o.product_id = ? AND o.status = 'active'
        ORDER BY o.created_at ASC, o.id ASC`,
      [row.id],
    );

    const [optionValueRows] = await conn.query<OptionValueRow[]>(
      `SELECT v.id, v.option_id, v.value
         FROM product_option_values v
         JOIN product_options o ON o.id = v.option_id
        WHERE o.product_id = ? AND v.status = 'active' AND o.status = 'active'
        ORDER BY v.created_at ASC, v.id ASC`,
      [row.id],
    );

    const [variantValueRows] = await conn.query<VariantValueRow[]>(
      `SELECT vov.variant_id, vov.option_value_id
         FROM variant_option_values vov
         JOIN product_option_values pov ON pov.id = vov.option_value_id
         JOIN product_options po       ON po.id = pov.option_id
        WHERE po.product_id = ?`,
      [row.id],
    );

    const [featureRows] = await conn.query<FeatureRow[]>(
      `SELECT id, feature
         FROM product_features
        WHERE product_id = ?
        ORDER BY sort_order ASC, created_at ASC, id ASC`,
      [row.id],
    );

    const [careRows] = await conn.query<CareRow[]>(
      `SELECT id, instruction
         FROM product_care_instructions
        WHERE product_id = ?
        ORDER BY sort_order ASC, created_at ASC, id ASC`,
      [row.id],
    );

    const [giftRows] = await conn.query<GiftRow[]>(
      `SELECT id, item
         FROM product_gift_included
        WHERE product_id = ?
        ORDER BY created_at ASC, id ASC`,
      [row.id],
    );

    const [reviewRows] = await conn.query<ReviewRow[]>(
      `SELECT COUNT(*) AS review_count, AVG(rating) AS review_average
         FROM product_reviews
        WHERE product_id = ? AND is_approved = 1`,
      [row.id],
    );

    const [linkRows] = await conn.query<CategoryLinkRow[]>(
      `SELECT c.id, c.name, c.slug, c.parent_id,
              par.name AS parent_name, par.slug AS parent_slug
         FROM product_categories pc
         JOIN categories c ON c.id = pc.category_id
         LEFT JOIN categories par ON par.id = c.parent_id
        WHERE pc.product_id = ?
        ORDER BY c.name ASC`,
      [row.id],
    );

    /* ---------------- options ---------------- */
    /* Only values that a variant of THIS product actually fills are offered,
       so a product never shows an option or value that was not chosen for it. */
    const valuesByVariant = new Map<string, string[]>();
    const usedValueIds = new Set<string>();
    for (const link of variantValueRows) {
      const list = valuesByVariant.get(link.variant_id) ?? [];
      list.push(link.option_value_id);
      valuesByVariant.set(link.variant_id, list);
      usedValueIds.add(link.option_value_id);
    }

    const valuesByOption = new Map<string, { id: string; value: string }[]>();
    for (const value of optionValueRows) {
      if (!usedValueIds.has(value.id)) continue;
      const list = valuesByOption.get(value.option_id) ?? [];
      list.push({ id: value.id, value: value.value });
      valuesByOption.set(value.option_id, list);
    }

    const options: CollectionOption[] = optionRows
      .map((option) => ({
        id: option.id,
        name: option.name,
        values: valuesByOption.get(option.id) ?? [],
      }))
      .filter((option) => option.values.length > 0);

    /* ---------------- which variant? ---------------- */
    const requested = variantRef
      ? (variantRefRows.find((item) => item.sku === variantRef) ??
        variantRefRows.find((item) => item.id === variantRef) ??
        null)
      : null;

    /* The featured variant is the one the storefront advertised, so it wins
       over the cheapest-in-stock default even when another variant is cheaper. */
    const featuredVariant = variantRefRows.find(
      (item) => item.status === "active" && Boolean(item.is_featured),
    );

    const chosen =
      requested ??
      featuredVariant ??
      variantRefRows.find(
        (item) => item.status === "active" && Number(item.stock) > 0,
      ) ??
      variantRefRows.find((item) => item.status === "active") ??
      variantRefRows[0] ??
      null;

    /* ---------------- one variant, in full ---------------- */
    let variant: CollectionVariant | null = null;

    if (chosen) {
      const [fullRows] = await conn.query<VariantRow[]>(
        `SELECT v.id, v.sku, v.name, v.brief_description, v.description,
                v.price, v.compare_at_price, v.stock, v.weight,
                v.length, v.width, v.height, v.dimension_unit,
                v.status, v.is_featured
           FROM product_variants v
          WHERE v.id = ?
          LIMIT 1`,
        [chosen.id],
      );

      const [variantFeatureRows] = await conn.query<FeatureRow[]>(
        `SELECT id, feature
           FROM product_variant_features
          WHERE variant_id = ?
          ORDER BY sort_order ASC, created_at ASC, id ASC`,
        [chosen.id],
      );

      const [variantCareRows] = await conn.query<CareRow[]>(
        `SELECT id, instruction
           FROM product_variant_care_instructions
          WHERE variant_id = ?
          ORDER BY sort_order ASC, created_at ASC, id ASC`,
        [chosen.id],
      );

      const [imageRows] = await conn.query<ImageRow[]>(
        `SELECT f.id, f.url, f.alt_text
           FROM imagekit_files f
          WHERE f.entity_type = 'product_variant'
            AND f.file_purpose = 'product_variant_image'
            AND f.entity_id = ?
          ORDER BY f.sort_order ASC, f.created_at ASC, f.id ASC`,
        [chosen.id],
      );

      const full = fullRows[0];
      if (full) {
        const ownImages: CollectionProductImage[] = imageRows.map((image) => ({
          id: image.id,
          url: image.url,
          altText: image.alt_text ?? null,
        }));

        variant = {
          id: full.id,
          sku: full.sku,
          name: full.name,
          briefDescription: full.brief_description,
          description: full.description,
          price: Number(full.price ?? 0),
          compareAtPrice: toNumber(full.compare_at_price),
          stock: Number(full.stock ?? 0),
          weight: toNumber(full.weight),
          dimensions: {
            length: toNumber(full.length),
            width: toNumber(full.width),
            height: toNumber(full.height),
            dimensionUnit: full.dimension_unit ?? null,
          },
          status: full.status === "inactive" ? "inactive" : "active",
          isFeatured: Boolean(full.is_featured),
          features:
            variantFeatureRows.length > 0
              ? variantFeatureRows.map((feature) => ({
                  id: feature.id,
                  text: feature.feature,
                }))
              : featureRows.map((feature) => ({
                  id: feature.id,
                  text: feature.feature,
                })),
          careInstructions:
            variantCareRows.length > 0
              ? variantCareRows.map((care) => ({
                  id: care.id,
                  text: care.instruction,
                }))
              : careRows.map((care) => ({
                  id: care.id,
                  text: care.instruction,
                })),
          images:
            ownImages.length > 0
              ? ownImages
              : productImages.map((image) => ({
                  id: image.id,
                  url: image.url,
                  altText: image.alt_text ?? null,
                })),
          optionValueIds: valuesByVariant.get(full.id) ?? [],
        };
      }
    }

    const variants: CollectionVariantRef[] = variantRefRows.map((item) => ({
      id: item.id,
      sku: item.sku,
      status: item.status === "inactive" ? "inactive" : "active",
      optionValueIds: valuesByVariant.get(item.id) ?? [],
    }));

    /* ---------------- category path ---------------- */
    const subLink = linkRows.find((link) => link.parent_id !== null) ?? null;
    const rootLink = linkRows.find((link) => link.parent_id === null) ?? null;

    let category: CollectionCategoryRef | null = null;
    let subcategory: CollectionCategoryRef | null = null;

    if (subLink) {
      subcategory = { id: subLink.id, name: subLink.name, slug: subLink.slug };
      category = {
        id: subLink.parent_id ?? "",
        name: subLink.parent_name ?? "",
        slug: subLink.parent_slug ?? "",
      };
    } else if (rootLink) {
      category = { id: rootLink.id, name: rootLink.name, slug: rootLink.slug };
    }

    const reviews = reviewRows[0];
    const reviewCount = Number(reviews?.review_count ?? 0);

    const product: CollectionProductDetail = {
      id: row.id,
      code: row.code,
      name: row.name,
      slug: row.slug,
      briefDescription: row.brief_description,
      description: row.description,
      processingTime: row.processing_time,
      deliveryCharges: Number(row.delivery_charges ?? 0),
      isFeatured: Boolean(row.is_featured),
      dimensions: {
        length: toNumber(row.length),
        width: toNumber(row.width),
        height: toNumber(row.height),
        dimensionUnit: row.dimension_unit ?? null,
      },
      images: productImages.map((image) => ({
        id: image.id,
        url: image.url,
        altText: image.alt_text ?? null,
      })),
      options,
      reviews: {
        average: reviewCount > 0 ? Number(reviews?.review_average ?? 0) : 0,
        count: reviewCount,
      },
      features: featureRows.map((feature) => ({
        id: feature.id,
        text: feature.feature,
      })),
      careInstructions: careRows.map((care) => ({
        id: care.id,
        text: care.instruction,
      })),
      giftIncluded: giftRows.map((gift) => ({
        id: gift.id,
        text: gift.item,
      })),
      category,
      subcategory,
      href: `/collections/${category?.slug ?? ALL_SEGMENT}/${
        subcategory?.slug ?? ALL_SEGMENT
      }/${encodeURIComponent(row.code)}`,
    };

    const payload: CollectionProductResponse = { ok: true, product, variant, variants };
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[PUBLIC - COLLECTIONS - PRODUCT - GET]", err);
    return NextResponse.json(
      { error: "Could not load this product" },
      { status: 500 },
    );
  } finally {
    conn.release();
  }
}
