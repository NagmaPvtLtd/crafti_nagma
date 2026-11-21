import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";

import { getPool } from "../../../../../lib/Database/main.db";
import type {
  CollectionCategoryRef,
  CollectionOption,
  CollectionProductDetail,
  CollectionProductImage,
  CollectionProductResponse,
  CollectionVariant,
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
  is_featured: number | boolean;
}

interface ImageRow extends RowDataPacket {
  id: string;
  url: string;
  alt_text: string | null;
}

interface VariantImageRow extends ImageRow {
  variant_id: string;
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

function toNumber(value: number | string | null): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/* -------------------------------------------------------------------------- */
/*  GET /api/public/collections/product?code=<product code>                   */
/*  One active product with its options, variants (each with its own photos), */
/*  review summary and category path. The storefront opens on                   */
/*  `defaultVariantId` and swaps everything as the shopper picks values.       */
/* -------------------------------------------------------------------------- */

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const ref = (searchParams.get("code") ?? "").trim();

  if (!ref || ref.length > 120) {
    return NextResponse.json(
      { error: "A product code is required" },
      { status: 400 },
    );
  }

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const [productRows] = await conn.query<ProductRow[]>(
      `SELECT p.id, p.code, p.name, p.slug, p.brief_description, p.description,
              p.processing_time, p.delivery_charges, p.is_featured
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

    /* Every variant photo, grouped per variant by the time the payload is built. */
    const [variantImages] = await conn.query<VariantImageRow[]>(
      `SELECT f.id, f.entity_id AS variant_id, f.url, f.alt_text
         FROM imagekit_files f
         JOIN product_variants v ON v.id = f.entity_id
        WHERE f.entity_type = 'product_variant'
          AND f.file_purpose = 'product_variant_image'
          AND v.product_id = ?
        ORDER BY f.sort_order ASC, f.created_at ASC, f.id ASC`,
      [row.id],
    );

    const imagesByVariant = new Map<string, CollectionProductImage[]>();
    for (const image of variantImages) {
      const list = imagesByVariant.get(image.variant_id) ?? [];
      list.push({
        id: image.id,
        url: image.url,
        altText: image.alt_text ?? null,
      });
      imagesByVariant.set(image.variant_id, list);
    }

    const [variantRows] = await conn.query<VariantRow[]>(
      `SELECT v.id, v.sku, v.name, v.brief_description, v.description,
              v.price, v.compare_at_price, v.stock, v.weight,
              v.status, v.is_featured
         FROM product_variants v
        WHERE v.product_id = ?
        ORDER BY v.status = 'active' DESC, v.price ASC, v.created_at ASC`,
      [row.id],
    );

    const [optionRows] = await conn.query<OptionRow[]>(
      `SELECT o.id, o.name
         FROM product_options o
        WHERE o.product_id = ?
        ORDER BY o.created_at ASC, o.id ASC`,
      [row.id],
    );

    const [optionValueRows] = await conn.query<OptionValueRow[]>(
      `SELECT v.id, v.option_id, v.value
         FROM product_option_values v
         JOIN product_options o ON o.id = v.option_id
        WHERE o.product_id = ?
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
    const valuesByOption = new Map<string, { id: string; value: string }[]>();
    for (const value of optionValueRows) {
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

    /* ---------------- variants ---------------- */
    const valuesByVariant = new Map<string, string[]>();
    for (const link of variantValueRows) {
      const list = valuesByVariant.get(link.variant_id) ?? [];
      list.push(link.option_value_id);
      valuesByVariant.set(link.variant_id, list);
    }

    const variants: CollectionVariant[] = variantRows.map((variant) => {
      const own = imagesByVariant.get(variant.id) ?? [];
      const fallback: CollectionProductImage[] =
        own.length > 0
          ? []
          : productImages.map((image) => ({
              id: image.id,
              url: image.url,
              altText: image.alt_text ?? null,
            }));

      return {
        id: variant.id,
        sku: variant.sku,
        name: variant.name,
        briefDescription: variant.brief_description,
        description: variant.description,
        price: Number(variant.price ?? 0),
        compareAtPrice: toNumber(variant.compare_at_price),
        stock: Number(variant.stock ?? 0),
        weight: toNumber(variant.weight),
        status: variant.status === "inactive" ? "inactive" : "active",
        isFeatured: Boolean(variant.is_featured),
        images: own.length > 0 ? own : fallback,
        optionValueIds: valuesByVariant.get(variant.id) ?? [],
      };
    });

    const openableVariants = variants.filter(
      (variant) => variant.status === "active",
    );
    const defaultVariant =
      openableVariants.find((variant) => variant.stock > 0) ??
      openableVariants[0] ??
      variants[0] ??
      null;

    /* prices across active variants (list/card context) */
    const prices = openableVariants.map((variant) => variant.price);

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
      images: productImages.map((image) => ({
        id: image.id,
        url: image.url,
        altText: image.alt_text ?? null,
      })),
      options,
      variants,
      defaultVariantId: defaultVariant?.id ?? null,
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
      priceFrom: prices.length > 0 ? Math.min(...prices) : null,
      priceTo: prices.length > 0 ? Math.max(...prices) : null,
      category,
      subcategory,
      href: `/collections/${category?.slug ?? ALL_SEGMENT}/${
        subcategory?.slug ?? ALL_SEGMENT
      }/${encodeURIComponent(row.code)}`,
    };

    const payload: CollectionProductResponse = { ok: true, product };
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
