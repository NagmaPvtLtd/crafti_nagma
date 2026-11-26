import { NextRequest, NextResponse } from "next/server";

import { getPool } from "../../../../../lib/Database/main.db";
import type { CartResponse } from "../../../../../types/Cart.types";
import { invalidInput } from "../../../../../utils/Api/apiResponse.util";
import { requireAuth } from "../../../../../utils/Auth/Auth.requireRole.util";
import {
  cartTotals,
  loadCart,
  resolveUserCart,
  touchCart,
  type CartQuantityRow,
  type CartVariantRow,
} from "../../../../../utils/Cart/cart.util";
import { getCurrentDateTime } from "../../../../../utils/ValueFetcher/getDateTime.util";
import { generateULID } from "../../../../../utils/generateULID.util";
import { MAX_CART_QUANTITY } from "../../../../../utils/Cart/cartLimit.util";
import { cartAddSchema } from "../../../../../utils/zod/cart/cart.zod";

/* -------------------------------------------------------------------------- */
/*  POST /api/user/cart/items                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Adds a variant to the signed-in user's cart, or increments its existing line.
 *
 * @async
 * @function POST
 * @description Login-first write: there is no guest cart, so only a signed-in user
 *              can add (`requireAuth()`). One line per variant (`uq_cart_variant`),
 *              and stock is checked against the total the line would hold afterwards.
 *              The variant must be active, its stock not hidden (`hide_stock`) and
 *              not zero. Stock does **not** cap the line: the resulting quantity is
 *              bounded only by the variant's optional `min_order_qty` / `max_order_qty`
 *              (default 1 and the shared `MAX_CART_QUANTITY` ceiling), because the
 *              maker reviews every order before payment.
 *              The checks and the write run inside one transaction with the line
 *              locked `FOR UPDATE`, so two tabs cannot oversell the same variant.
 *              Every result returns the whole cart, so the client needs no refetch.
 *
 * @param {NextRequest} req - The incoming HTTP request with a JSON body
 *
 * @body {string} variantId - `product_variants.id` to add (trimmed, 2–40 characters)
 * @body {number} [quantity] - Units to add (integer 1–100, default: 1)
 *
 * @returns {Promise<NextResponse>} `no-store` JSON response with:
 *   - ok: always `true`
 *   - items: the whole cart after the write (`variantId`, `sku`, `productName`,
 *            `productCode`, `name`, `imageUrl`, `price`, `compareAtPrice`,
 *            `quantity`, `lineTotal`, `stock`, `minOrderQty`, `maxOrderQty`,
 *            `status`, `available`)
 *   - summary: `itemCount`, `quantity`, `subtotal` — available lines only
 *
 * @throws {400} Validation failed - malformed body or a `variantId` outside 2–40 chars
 * @throws {400} `"Out of stock"` - the variant is active but its `stock` is 0
 * @throws {400} `"Minimum order for this piece is N"` - the resulting line is below
 *               `min_order_qty`
 * @throws {400} `"You can order up to N of this piece at a time"` - the resulting line is above
 *               `max_order_qty`
 * @throws {401} Unauthorized - No session, inactive account, or a session without a user id
 * @throws {409} The variant does not exist ("This variant is no longer available")
 * @throws {409} The variant is inactive or its stock is hidden ("This variant is not available
 *               right now")
 * @throws {500} Database failure, or the cart could not be resolved
 *
 * @description Workflow:
 *   1. Authenticate the request with `requireAuth()` and read the trusted user id
 *      from `guard.session.user`
 *   2. Parse the JSON body and validate it with `cartAddSchema`; a failure returns
 *      `invalidInput()` (400 `{ error, details }`)
 *   3. Initialize the database pool with `getPool()` and take a connection
 *   4. Begin a transaction on the connection
 *   5. Select `id`, `stock`, `hide_stock`, `min_order_qty`, `max_order_qty` and `status` from
 *      `product_variants` for `variantId`
 *   6. Return 409 when the variant is missing, 409 when `status = 'inactive'`, and 409 when
 *      `hide_stock` is on
 *   7. Read `stock` as a number and return 400 `"Out of stock"` when it is 0 or less
 *   8. Resolve or create the user's active cart with
 *      `resolveUserCart(conn, userId, true)`
 *   9. Lock the existing `cart_items` line for this cart and variant `FOR UPDATE`
 *   10. Read its `quantity` (0 when the line does not exist) and add the requested
 *       `quantity`; stock is never compared against the result
 *   11. Return 400 `"Minimum order for this piece is N"` when the result is below
 *       `min_order_qty` (default 1)
 *   12. Return 400 `"You can order up to N of this piece at a time"` when the result exceeds
 *       `max_order_qty`, or `MAX_CART_QUANTITY` (100) while no maximum is set
 *   13. Insert the line (`generateULID("cit")`, `created_at`, `updated_at`) or update
 *       its `quantity` and `updated_at`
 *   14. Bump `carts.updated_at` with `touchCart()`
 *   15. Commit the transaction
 *   16. Reload the whole cart with `loadCart()` and compute `cartTotals()`
 *   17. Return 200 `no-store` response with `{ ok, items, summary }`
 *   18. Roll back the transaction and release the connection on error
 */

export async function POST(req: NextRequest) {
  const guard = await requireAuth({ label: "POST /api/user/cart/items" });
  if (!guard.ok) return guard.response;

  const userId = guard.session.user.id;
  if (!userId) {
    console.warn("[CART - ITEMS - POST] ✕ session has no user id");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = cartAddSchema.safeParse(body);
  if (!parsed.success) {
    return invalidInput(parsed.error.flatten().fieldErrors);
  }

  const { variantId, quantity } = parsed.data;

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [variantRows] = await conn.query<CartVariantRow[]>(
      `SELECT id, stock, hide_stock, min_order_qty, max_order_qty, status
         FROM product_variants
        WHERE id = ?
        LIMIT 1`,
      [variantId],
    );

    const variant = variantRows[0];
    if (!variant) {
      await conn.rollback();
      return NextResponse.json(
        { error: "This variant is no longer available" },
        { status: 409 },
      );
    }

    /* A hidden variant is sold out from the shopper's point of view, even when
       the manager kept the stock number. */
    if (variant.status !== "active" || Boolean(variant.hide_stock)) {
      await conn.rollback();
      return NextResponse.json(
        { error: "This variant is not available right now" },
        { status: 409 },
      );
    }

    const stock = Number(variant.stock ?? 0);
    if (stock <= 0) {
      await conn.rollback();
      return NextResponse.json({ error: "Out of stock" }, { status: 400 });
    }

    const cartId = await resolveUserCart(conn, userId, true);
    if (!cartId) {
      await conn.rollback();
      return NextResponse.json(
        { error: "Could not add this item to your cart" },
        { status: 500 },
      );
    }

    const [lineRows] = await conn.query<CartQuantityRow[]>(
      `SELECT quantity
         FROM cart_items
        WHERE cart_id = ? AND variant_id = ?
        FOR UPDATE`,
      [cartId, variantId],
    );

    const current = lineRows[0] ? Number(lineRows[0].quantity ?? 0) : 0;
    const nextQuantity = current + quantity;

    const minOrder = Number(variant.min_order_qty ?? 1);
    if (nextQuantity < minOrder) {
      await conn.rollback();
      return NextResponse.json(
        { error: `Minimum order for this piece is ${minOrder}` },
        { status: 400 },
      );
    }

    /* The maker's maximum is the only upper bound — stock never caps a line — and
       the shared cart ceiling applies when no maximum was set. */
    const maxOrder =
      variant.max_order_qty === null
        ? MAX_CART_QUANTITY
        : Math.min(Number(variant.max_order_qty), MAX_CART_QUANTITY);
    if (nextQuantity > maxOrder) {
      await conn.rollback();
      return NextResponse.json(
        { error: `You can order up to ${maxOrder} of this piece at a time` },
        { status: 400 },
      );
    }

    const now = getCurrentDateTime();

    if (lineRows[0]) {
      await conn.execute(
        `UPDATE cart_items
            SET quantity = ?, updated_at = ?
          WHERE cart_id = ? AND variant_id = ?`,
        [nextQuantity, now, cartId, variantId],
      );
    } else {
      await conn.execute(
        `INSERT INTO cart_items
                (id, cart_id, variant_id, quantity, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [generateULID("cit"), cartId, variantId, nextQuantity, now, now],
      );
    }

    await touchCart(conn, cartId, now);
    await conn.commit();

    const items = await loadCart(conn, cartId);
    const payload: CartResponse = {
      ok: true,
      items,
      summary: cartTotals(items),
    };

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
      /* The transaction may already be closed — the original error matters. */
    }
    console.error("[CART - ITEMS - POST]", err);
    return NextResponse.json(
      { error: "Could not add this item to your cart" },
      { status: 500 },
    );
  } finally {
    conn.release();
  }
}
