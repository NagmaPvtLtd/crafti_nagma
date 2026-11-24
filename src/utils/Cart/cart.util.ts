import type { PoolConnection, RowDataPacket } from "mysql2/promise";

import type {
  CartItemView,
  CartResponse,
  CartSummary,
} from "../../types/Cart.types";
import { isDuplicateEntry } from "../Api/apiResponse.util";
import { toNumber } from "../Formator/toNumber.util";
import { getCurrentDateTime } from "../ValueFetcher/getDateTime.util";
import { generateULID } from "../generateULID.util";

interface CartRow extends RowDataPacket {
  id: string;
}

/* Query rows shared by the cart routes. */
export interface CartVariantRow extends RowDataPacket {
  id: string;
  stock: number | string;
  status: "active" | "inactive";
}

export interface CartQuantityRow extends RowDataPacket {
  quantity: number | string;
}

export interface CartItemIdRow extends RowDataPacket {
  id: string;
}

interface CartItemRow extends RowDataPacket {
  variant_id: string;
  quantity: number | string;
  sku: string;
  variant_name: string | null;
  product_name: string;
  product_code: string;
  price: number | string;
  compare_at_price: number | string | null;
  stock: number | string;
  status: "active" | "inactive";
  image_url: string | null;
}

/**
 * The signed-in user's `status = 'active'` cart.
 *
 * @param {PoolConnection} conn - An open connection
 * @param {string} userId - The trusted session user id
 * @param {boolean} create - Insert the cart when the user has none yet
 * @returns {Promise<string | null>} The cart id, or `null` when `create` is false and no cart exists
 *
 * @description A user can only own one active cart (`uq_carts_user_active`), so a
 *              parallel request that inserts first makes this insert fail with a
 *              duplicate key — the cart it created is then re-selected.
 */
export async function resolveUserCart(
  conn: PoolConnection,
  userId: string,
  create: boolean,
): Promise<string | null> {
  const existing = await findActiveCart(conn, userId);
  if (existing) return existing;
  if (!create) return null;

  const id = generateULID("crt");
  const now = getCurrentDateTime();

  try {
    await conn.execute(
      `INSERT INTO carts (id, user_id, status, created_at, updated_at)
       VALUES (?, ?, 'active', ?, ?)`,
      [id, userId, now, now],
    );
    return id;
  } catch (err) {
    /* Another request created this user's cart first — take that one. */
    if (isDuplicateEntry(err)) {
      return findActiveCart(conn, userId);
    }
    throw err;
  }
}

async function findActiveCart(
  conn: PoolConnection,
  userId: string,
): Promise<string | null> {
  const [rows] = await conn.query<CartRow[]>(
    `SELECT id
       FROM carts
      WHERE user_id = ? AND status = 'active'
      ORDER BY created_at ASC, id ASC
      LIMIT 1`,
    [userId],
  );
  return rows[0]?.id ?? null;
}

/** Bumps `carts.updated_at` — every cart mutation calls this. */
export async function touchCart(
  conn: PoolConnection,
  cartId: string,
  now: string,
): Promise<void> {
  await conn.execute(`UPDATE carts SET updated_at = ? WHERE id = ?`, [
    now,
    cartId,
  ]);
}

/**
 * Every line of a cart, with its variant, product and one representative photo.
 *
 * @param {PoolConnection} conn - An open connection
 * @param {string} cartId - `carts.id`
 * @returns {Promise<CartItemView[]>} The lines in the order they were added
 *
 * @description One query joins `cart_items → product_variants → products`. The
 *              photo follows README_THUMBNAILS: the variant's first photo
 *              (`sort_order`, `created_at`, `id`), falling back to the product's
 *              first photo, and `null` when neither exists.
 */
export async function loadCart(
  conn: PoolConnection,
  cartId: string,
): Promise<CartItemView[]> {
  const [rows] = await conn.query<CartItemRow[]>(
    `SELECT ci.variant_id,
            ci.quantity,
            v.sku,
            v.name AS variant_name,
            v.price,
            v.compare_at_price,
            v.stock,
            v.status,
            p.name AS product_name,
            p.code AS product_code,
            COALESCE(
              (SELECT f.url
                 FROM imagekit_files f
                WHERE f.entity_type = 'product_variant'
                  AND f.file_purpose = 'product_variant_image'
                  AND f.entity_id = v.id
                ORDER BY f.sort_order ASC, f.created_at ASC, f.id ASC
                LIMIT 1),
              (SELECT f.url
                 FROM imagekit_files f
                WHERE f.entity_type = 'product'
                  AND f.entity_id = p.id
                ORDER BY f.sort_order ASC, f.created_at ASC, f.id ASC
                LIMIT 1)
            ) AS image_url
       FROM cart_items ci
       JOIN product_variants v ON v.id = ci.variant_id
       JOIN products p ON p.id = v.product_id
      WHERE ci.cart_id = ?
      ORDER BY ci.created_at ASC, ci.id ASC`,
    [cartId],
  );

  return rows.map((row) => {
    const price = toNumber(row.price) ?? 0;
    const quantity = Number(row.quantity ?? 0);
    const stock = Number(row.stock ?? 0);
    const status = row.status === "inactive" ? "inactive" : "active";

    return {
      variantId: row.variant_id,
      sku: row.sku,
      productName: row.product_name,
      productCode: row.product_code,
      name: row.variant_name?.trim() || row.product_name,
      imageUrl: row.image_url ?? null,
      price,
      compareAtPrice: toNumber(row.compare_at_price),
      quantity,
      lineTotal: Number((price * quantity).toFixed(2)),
      stock,
      status,
      available: status === "active" && stock > 0,
    };
  });
}

/**
 * The single empty cart shape every route returns when the user has no lines.
 * Used by `GET`, the no-cart branches and `DELETE /api/user/cart`.
 */
export function emptyCartPayload(): CartResponse {
  const items: CartItemView[] = [];
  return { ok: true, items, summary: cartTotals(items) };
}

/**
 * Totals for the summary panel: only active, in-stock lines count.
 * Inactive or sold-out lines stay in the list but are priced out.
 */
export function cartTotals(items: CartItemView[]): CartSummary {
  let itemCount = 0;
  let quantity = 0;
  let subtotal = 0;

  for (const item of items) {
    if (!item.available) continue;
    itemCount += 1;
    quantity += item.quantity;
    subtotal += item.lineTotal;
  }

  return { itemCount, quantity, subtotal: Number(subtotal.toFixed(2)) };
}
