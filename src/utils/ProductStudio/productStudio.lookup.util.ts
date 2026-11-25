import type { RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";

interface IdRow extends RowDataPacket {
  id: string;
}

/**
 * Resolves a product reference from the URL. Both the readable `code` and the
 * internal `id` are accepted so links stay readable.
 */
export async function resolveProductId(
  conn: PoolConnection,
  productRef: string,
): Promise<string | null> {
  const [rows] = await conn.query<IdRow[]>(
    `SELECT id FROM products WHERE id = ? OR code = ? LIMIT 1`,
    [productRef, productRef],
  );
  return rows[0]?.id ?? null;
}

/** Same for a variant — its SKU or internal id, scoped to the product. */
export async function resolveVariantId(
  conn: PoolConnection,
  productId: string,
  variantRef: string,
): Promise<string | null> {
  const [rows] = await conn.query<IdRow[]>(
    `SELECT id FROM product_variants
      WHERE product_id = ? AND (id = ? OR sku = ?)
      LIMIT 1`,
    [productId, variantRef, variantRef],
  );
  return rows[0]?.id ?? null;
}
