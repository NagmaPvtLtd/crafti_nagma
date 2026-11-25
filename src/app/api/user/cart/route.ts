import { NextResponse } from "next/server";

import { getPool } from "../../../../lib/Database/main.db";
import type { CartResponse } from "../../../../types/Cart.types";
import { requireAuth } from "../../../../utils/Auth/Auth.requireRole.util";
import {
  cartTotals,
  emptyCartPayload,
  loadCart,
  resolveUserCart,
  touchCart,
} from "../../../../utils/Cart/cart.util";
import { getCurrentDateTime } from "../../../../utils/ValueFetcher/getDateTime.util";

/* -------------------------------------------------------------------------- */
/*  GET /api/user/cart                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Fetches the signed-in user's active cart, creating it on first access.
 *
 * @async
 * @function GET
 * @description Login-first cart read: there is no guest cart and no session-based
 *              cart. The user's `status = 'active'` `carts` row is resolved from the
 *              trusted session id, created lazily when missing, and every line is
 *              loaded with its variant, product and one thumbnail. Totals count
 *              only active, in-stock lines.
 *
 * @returns {Promise<NextResponse>} `no-store` JSON response with:
 *   - ok: always `true`
 *   - items: every line with `variantId`, `sku`, `productName`, `productCode`,
 *            `name`, `imageUrl`, `price`, `compareAtPrice`, `quantity`,
 *            `lineTotal`, `stock`, `status`, `available`
 *   - summary: `itemCount`, `quantity`, `subtotal` — available lines only
 *
 * @throws {401} Unauthorized - No session, inactive account, or a session without a user id
 * @throws {500} Database failure while resolving or loading the cart
 *
 * @description Workflow:
 *   1. Authenticate the request with `requireAuth()` and read the trusted user id
 *      from `guard.session.user`
 *   2. Initialize the database pool with `getPool()` and take a connection
 *   3. Resolve the user's active cart with `resolveUserCart(conn, userId, true)`,
 *      inserting a `carts` row (`generateULID("crt")`, `status = 'active'`) when
 *      none exists; a duplicate-key race re-selects the cart it created
 *   4. Load the lines with `loadCart()` — `cart_items → product_variants → products`,
 *      first variant photo falling back to the first product photo, ordered by
 *      `cart_items.created_at`
 *   5. Compute `cartTotals()` over the lines, counting only active lines with stock
 *   6. Return 200 `no-store` response with `{ ok, items, summary }`
  *   7. Release the connection after the response, on success or failure
 */

export async function GET() {
  const guard = await requireAuth({ label: "GET /api/user/cart" });
  if (!guard.ok) return guard.response;

  const userId = guard.session.user.id;
  if (!userId) {
    console.warn("[CART - GET] ✕ session has no user id");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const cartId = await resolveUserCart(conn, userId, true);
    const items = cartId ? await loadCart(conn, cartId) : [];
    const payload: CartResponse = {
      ok: true,
      items,
      summary: cartTotals(items),
    };

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[CART - GET]", err);
    return NextResponse.json(
      { error: "Could not load your cart" },
      { status: 500 },
    );
  } finally {
    conn.release();
  }
}

/* -------------------------------------------------------------------------- */
/*  DELETE /api/user/cart                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Empties the signed-in user's active cart.
 *
 * @async
 * @function DELETE
 * @description Deletes every `cart_items` line of the user's active cart and bumps
 *              `carts.updated_at`. The cart row itself is kept, so the next read is
 *              still the same cart. Idempotent: an account with no cart receives the
 *              empty payload instead of an error.
 *
 * @returns {Promise<NextResponse>} `no-store` JSON response with:
 *   - ok: always `true`
 *   - items: an empty array
 *   - summary: `itemCount: 0`, `quantity: 0`, `subtotal: 0`
 *
 * @throws {401} Unauthorized - No session, inactive account, or a session without a user id
 * @throws {500} Database failure while clearing the cart
 *
 * @description Workflow:
 *   1. Authenticate the request with `requireAuth()` and read the trusted user id
 *      from `guard.session.user`
 *   2. Initialize the database pool with `getPool()` and take a connection
 *   3. Resolve the active cart with `resolveUserCart(conn, userId, false)` — no cart
 *      means there is nothing to clear, so return the empty payload
 *   4. Delete every `cart_items` row of that cart
 *   5. Bump `carts.updated_at` with `touchCart()` and `getCurrentDateTime()`
 *   6. Return 200 `no-store` response with the empty payload
  *   7. Release the connection on error and success
 */

export async function DELETE() {
  const guard = await requireAuth({ label: "DELETE /api/user/cart" });
  if (!guard.ok) return guard.response;

  const userId = guard.session.user.id;
  if (!userId) {
    console.warn("[CART - DELETE] ✕ session has no user id");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const cartId = await resolveUserCart(conn, userId, false);
    if (!cartId) {
      return NextResponse.json(emptyCartPayload(), {
        headers: { "Cache-Control": "no-store" },
      });
    }

    await conn.execute(`DELETE FROM cart_items WHERE cart_id = ?`, [cartId]);
    await touchCart(conn, cartId, getCurrentDateTime());

    return NextResponse.json(emptyCartPayload(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[CART - DELETE]", err);
    return NextResponse.json(
      { error: "Could not clear your cart" },
      { status: 500 },
    );
  } finally {
    conn.release();
  }
}
