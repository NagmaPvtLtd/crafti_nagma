import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "../../../../../../utils/Auth/Auth.requireRole.util";
import { getPool } from "../../../../../../lib/Database/main.db";

/* -------------------------------------------------------------------------- */
/*  GET /api/manager/products/[id]                                            */
/* -------------------------------------------------------------------------- */

type ProductRow = {
  id: string;
  code: string;
  name: string;
  slug: string;
  brief_description: string | null;
  description: string | null;
  meta_title: string | null;
  meta_description: string | null;
  delivery_charges: number | string;
  processing_time: string | null;
  is_featured: number | boolean;
  main_showcase: number | boolean;
  orders_count: number | string;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string | null;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole(["manager", "admin", "super_admin"], {
    label: "GET /api/manager/products/[id]",
  });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!id || id.length < 10) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    /* ---- product ---- */
    const [productRows] = await conn.query<ProductRow[]>(
      `SELECT id, code, name, slug,
              brief_description, description,
              meta_title, meta_description,
              delivery_charges, processing_time,
              is_featured, main_showcase, orders_count, status,
              created_at, updated_at
         FROM products
        WHERE id = ?
        LIMIT 1`,
      [id],
    );
    if (productRows.length === 0) {
      return NextResponse.json({ error: "product_not_found" }, { status: 404 });
    }
    const p = productRows[0];

    /* ---- categories ---- */
    const [categoryRows] = await conn.query<
      { id: string; name: string; slug: string }[]
    >(
      `SELECT c.id, c.name, c.slug
         FROM product_categories pc
         JOIN categories c ON c.id = pc.category_id
        WHERE pc.product_id = ?
        ORDER BY c.name ASC`,
      [id],
    );

    /* ---- variants (with option value labels aggregated) ---- */
    const [variantRows] = await conn.query<
      {
        id: string;
        name: string | null;
        description: string | null;
        sku: string;
        price: number | string;
        compare_at_price: number | string | null;
        stock: number | string;
        weight: number | string | null;
        sort_order: number | string;
        status: "active" | "inactive";
      }[]
    >(
      `SELECT id, name, description, sku,
              price, compare_at_price, stock, weight,
              sort_order, status
         FROM product_variants
        WHERE product_id = ?
        ORDER BY sort_order ASC, created_at ASC`,
      [id],
    );

    /* ---- images ---- */
    const [imageRows] = await conn.query<
      {
        id: string;
        url: string;
        file_id: string;
        alt_text: string | null;
        file_purpose: string;
        sort_order: number | string;
      }[]
    >(
      `SELECT id, url, file_id, alt_text, file_purpose, sort_order
         FROM imagekit_files
        WHERE entity_type = 'products' AND entity_id = ?
        ORDER BY sort_order ASC, created_at ASC`,
      [id],
    );

    /* ---- features / care / gifts ---- */
    const [featureRows] = await conn.query<{ id: string; feature: string }[]>(
      `SELECT id, feature FROM product_features
        WHERE product_id = ? ORDER BY sort_order ASC`,
      [id],
    );
    const [careRows] = await conn.query<{ id: string; instruction: string }[]>(
      `SELECT id, instruction FROM product_care_instructions
        WHERE product_id = ? ORDER BY sort_order ASC`,
      [id],
    );
    const [giftRows] = await conn.query<{ id: string; item: string }[]>(
      `SELECT id, item FROM product_gift_included
        WHERE product_id = ? ORDER BY sort_order ASC`,
      [id],
    );

    /* ---- personalizations ---- */
    const [personalizationRows] = await conn.query<
      {
        id: string;
        title: string;
        description: string | null;
        input_type: "text" | "textarea" | "date";
        placeholder: string | null;
        is_required: number | boolean;
        max_length: number | string | null;
        sort_order: number | string;
      }[]
    >(
      `SELECT id, title, description, input_type,
              placeholder, is_required, max_length, sort_order
         FROM product_personalizations
        WHERE product_id = ?
        ORDER BY sort_order ASC`,
      [id],
    );

    return NextResponse.json({
      ok: true,
      product: {
        id: p.id,
        code: p.code,
        name: p.name,
        slug: p.slug,
        briefDescription: p.brief_description ?? "",
        description: p.description ?? "",
        metaTitle: p.meta_title ?? "",
        metaDescription: p.meta_description ?? "",
        deliveryCharges: Number(p.delivery_charges ?? 0),
        processingTime: p.processing_time ?? "",
        isFeatured: Boolean(p.is_featured),
        mainShowcase: Boolean(p.main_showcase),
        ordersCount: Number(p.orders_count ?? 0),
        status: p.status,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      },
      categories: categoryRows,
      variants: variantRows.map((v) => ({
        id: v.id,
        name: v.name ?? "",
        description: v.description ?? "",
        sku: v.sku,
        price: Number(v.price),
        compareAtPrice:
          v.compare_at_price === null ? null : Number(v.compare_at_price),
        stock: Number(v.stock ?? 0),
        weight: v.weight === null ? null : Number(v.weight),
        sortOrder: Number(v.sort_order ?? 0),
        status: v.status,
      })),
      images: imageRows.map((i) => ({
        id: i.id,
        url: i.url,
        fileId: i.file_id,
        altText: i.alt_text ?? "",
        purpose: i.file_purpose,
        sortOrder: Number(i.sort_order ?? 0),
      })),
      features: featureRows,
      careInstructions: careRows,
      giftIncluded: giftRows,
      personalizations: personalizationRows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description ?? "",
        inputType: r.input_type,
        placeholder: r.placeholder ?? "",
        isRequired: Boolean(r.is_required),
        maxLength: r.max_length === null ? null : Number(r.max_length),
        sortOrder: Number(r.sort_order ?? 0),
      })),
    });
  } catch (err) {
    console.error("[PRODUCTS - ONE - GET]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  } finally {
    conn.release();
  }
}
