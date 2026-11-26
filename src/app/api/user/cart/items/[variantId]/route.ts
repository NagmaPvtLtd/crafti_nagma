import { NextRequest, NextResponse } from "next/server";

import { getPool } from "../../../../../../lib/Database/main.db";
import type { CartResponse } from "../../../../../../types/Cart.types";
import { invalidInput } from "../../../../../../utils/Api/apiResponse.util";
import { requireAuth } from "../../../../../../utils/Auth/Auth.requireRole.util";
import {
  cartTotals,
  emptyCartPayload,
  loadCart,
  resolveUserCart,
  touchCart,
  type CartItemIdRow,
  type CartVariantRow,
} from "../../../../../../utils/Cart/cart.util";
import { getCurrentDateTime } from "../../../../../../utils/ValueFetcher/getDateTime.util";
import { MAX_CART_QUANTITY } from "../../../../../../utils/Cart/cartLimit.util";
import { cartUpdateSchema } from "../../../../../../utils/zod/cart/cart.zod";

type VariantRouteContext = {
  params: Promise<{ variantId: string }>;
};

/* -------------------------------------------------------------------------- */
/*  PATCH /api/user/cart/items/[variantId]                                    */
/* -------------------------------------------------------------------------- */

/**
 * Sets one cart line's quantity; `0` removes the line.
 *
 * @async
 * @function PATCH
 * @description The quantity is not capped by the variant's stock: every order is
 *              reviewed and approved by the admin before payment, so the requested
 *              amount is bounded by the 0–100 body schema and by the variant's own
 *              `min_order_qty` / `max_order_qty` limits. An inactive or hidden-stock
 *              (`hide_stock`) variant cannot be given a positive quantity, but its line
 *              can still be removed — `0` is always allowed. A user without a cart
 *              gets the empty payload back. The variant checks and the update run
 *              inside one transaction with the line locked `FOR UPDATE`.
 *
 * @param {NextRequest} req - The incoming HTTP request with a JSON body
 * @param {Object} context - Next.js route context
 * @param {Promise<{ variantId: string }>} context.params - Route parameters
 *                        (`(await context.params).variantId`)
 *
 * @body {number} quantity - New line quantity (integer 0–100; `0` removes the line)
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: always `true`
 *   - items: the whole cart after the change
 *   - summary: `itemCount`, `quantity`, `subtotal` — available lines only
 *
 * @throws {400} Validation failed - malformed body, bad `variantId` length, or quantity outside 0–100
 * @throws {400} `"Out of stock"` - the variant is active but its `stock` is 0
 * @throws {400} `"Minimum order for this piece is N"` - the quantity is below `min_order_qty`
 * @throws {400} `"You can order up to N of this piece at a time"` - the quantity is above
 *               `max_order_qty`
 * @throws {401} Unauthorized - No session, inactive account, or a session without a user id
 * @throws {404} The line is not in the cart ("This item is not in your cart")
 * @throws {409} The variant does not exist, is inactive, or its stock is hidden
 * @throws {500} Database failure while updating the line
 *
 * @description Workflow:
 *   1. Authenticate the request with `requireAuth()` and read the trusted user id
 *      from `guard.session.user`
 *   2. Read `variantId` from `context.params` and reject a missing or longer-than-40
 *      reference with 400
 *   3. Parse the JSON body and validate it with `cartUpdateSchema`; a failure returns
 *      `invalidInput()` (400 `{ error, details }`)
 *   4. Initialize the database pool with `getPool()` and take a connection
 *   5. Resolve the active cart with `resolveUserCart(conn, userId, false)` — no cart
 *      returns the empty payload
 *   6. When `quantity === 0`: delete the `cart_items` line, bump `carts.updated_at`,
 *      reload the cart and return it (no stock check on removal)
 *   7. Begin a transaction on the connection
 *   8. Select `id`, `stock`, `hide_stock`, `min_order_qty`, `max_order_qty` and `status` from
 *      `product_variants` for `variantId`
 *   9. Return 409 when the variant is missing, 409 when `status = 'inactive'`, and 409 when
 *      `hide_stock` is on
 *   10. Read `stock`; return 400 `"Out of stock"` when it is 0 or less. The
 *       requested quantity itself is not compared against stock
 *   11. Return 400 `"Minimum order for this piece is N"` when the quantity is below
 *       `min_order_qty` (default 1)
 *   12. Return 400 `"You can order up to N of this piece at a time"` when `max_order_qty` is set
 *       and the quantity exceeds it
 *   13. Lock the `cart_items` line `FOR UPDATE` and return 404 when it is absent
 *   14. Update the line's `quantity` and `updated_at`
 *   15. Bump `carts.updated_at` with `touchCart()` and commit the transaction
 *   16. Reload the cart with `loadCart()` and compute `cartTotals()`
 *   17. Return 200 response with `{ ok, items, summary }`
 *   18. Roll back the transaction and release the connection on error
 */

export async function PATCH(req: NextRequest, ctx: VariantRouteContext) {
  const guard = await requireAuth({
    label: "PATCH /api/user/cart/items/[variantId]",
  });
  if (!guard.ok) return guard.response;

  const userId = guard.session.user.id;
  if (!userId) {
    console.warn("[CART - ITEMS - PATCH] ✕ session has no user id");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { variantId } = await ctx.params;
  if (!variantId || variantId.length > 40) {
    return NextResponse.json(
      { error: "That variant reference is not valid" },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = cartUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return invalidInput(parsed.error.flatten().fieldErrors);
  }

  const quantity = parsed.data.quantity;

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const cartId = await resolveUserCart(conn, userId, false);
    if (!cartId) {
      return NextResponse.json(emptyCartPayload());
    }

    /* 0 removes the line — no stock or availability check needed to delete. */
    if (quantity === 0) {
      const now = getCurrentDateTime();
      await conn.execute(
        `DELETE FROM cart_items WHERE cart_id = ? AND variant_id = ?`,
        [cartId, variantId],
      );
      await touchCart(conn, cartId, now);

      const items = await loadCart(conn, cartId);
      return NextResponse.json({
        ok: true,
        items,
        summary: cartTotals(items),
      } satisfies CartResponse);
    }

    await conn.beginTransaction();

    try {
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

      /* Hidden stock reads as sold out, so the line cannot be raised either. */
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

      const minOrder = Number(variant.min_order_qty ?? 1);
      if (quantity < minOrder) {
        await conn.rollback();
        return NextResponse.json(
          { error: `Minimum order for this piece is ${minOrder}` },
          { status: 400 },
        );
      }

      const maxOrder =
        variant.max_order_qty === null
          ? null
          : Math.min(Number(variant.max_order_qty), MAX_CART_QUANTITY);
      if (maxOrder !== null && quantity > maxOrder) {
        await conn.rollback();
        return NextResponse.json(
          { error: `You can order up to ${maxOrder} of this piece at a time` },
          { status: 400 },
        );
      }

      const [lineRows] = await conn.query<CartItemIdRow[]>(
        `SELECT id
           FROM cart_items
          WHERE cart_id = ? AND variant_id = ?
          FOR UPDATE`,
        [cartId, variantId],
      );

      const line = lineRows[0];
      if (!line) {
        await conn.rollback();
        return NextResponse.json(
          { error: "This item is not in your cart" },
          { status: 404 },
        );
      }

      const now = getCurrentDateTime();
      await conn.execute(
        `UPDATE cart_items SET quantity = ?, updated_at = ? WHERE id = ?`,
        [quantity, now, line.id],
      );
      await touchCart(conn, cartId, now);
      await conn.commit();
    } catch (err) {
      try {
        await conn.rollback();
      } catch {
        /* Already closed — rethrow the original error below. */
      }
      throw err;
    }

    const items = await loadCart(conn, cartId);
    return NextResponse.json({
      ok: true,
      items,
      summary: cartTotals(items),
    } satisfies CartResponse);
  } catch (err) {
    console.error("[CART - ITEMS - PATCH]", err);
    return NextResponse.json(
      { error: "Could not update this item" },
      { status: 500 },
    );
  } finally {
    conn.release();
  }
}

/* -------------------------------------------------------------------------- */
/*  DELETE /api/user/cart/items/[variantId]                                   */
/* -------------------------------------------------------------------------- */

/**
 * Removes one variant's line from the signed-in user's cart.
 *
 * @async
 * @function DELETE
 * @description Idempotent: removing a line that is already gone, or removing from an
 *              account with no cart, returns the current cart unchanged. The cart row
 *              is kept and its `updated_at` is bumped.
 *
 * @param {NextRequest} req - The incoming HTTP request (not read by this handler)
 * @param {Object} context - Next.js route context
 * @param {Promise<{ variantId: string }>} context.params - Route parameters
 *                        (`(await context.params).variantId`)
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: always `true`
 *   - items: the whole cart after the removal
 *   - summary: `itemCount`, `quantity`, `subtotal` — available lines only
 *
 * @throws {400} Validation error - missing `variantId` or longer than 40 characters
 * @throws {401} Unauthorized - No session, inactive account, or a session without a user id
 * @throws {500} Database failure while removing the line
 *
 * @description Workflow:
 *   1. Authenticate the request with `requireAuth()` and read the trusted user id
 *      from `guard.session.user`
 *   2. Read `variantId` from `context.params` and reject a missing or longer-than-40
 *      reference with 400
 *   3. Initialize the database pool with `getPool()` and take a connection
 *   4. Resolve the active cart with `resolveUserCart(conn, userId, false)` — no cart
 *      returns the empty payload
 *   5. Delete the matching `cart_items` row for that cart and variant
 *   6. Bump `carts.updated_at` with `touchCart()` and `getCurrentDateTime()`
 *   7. Reload the cart with `loadCart()` and compute `cartTotals()`
 *   8. Return 200 response with `{ ok, items, summary }`
  *   9. Release the connection on error and success
 */

export async function DELETE(_req: NextRequest, ctx: VariantRouteContext) {
  const guard = await requireAuth({
    label: "DELETE /api/user/cart/items/[variantId]",
  });
  if (!guard.ok) return guard.response;

  const userId = guard.session.user.id;
  if (!userId) {
    console.warn("[CART - ITEMS - DELETE] ✕ session has no user id");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { variantId } = await ctx.params;
  if (!variantId || variantId.length > 40) {
    return NextResponse.json(
      { error: "That variant reference is not valid" },
      { status: 400 },
    );
  }

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const cartId = await resolveUserCart(conn, userId, false);
    if (!cartId) {
      return NextResponse.json(emptyCartPayload());
    }

    const now = getCurrentDateTime();
    await conn.execute(
      `DELETE FROM cart_items WHERE cart_id = ? AND variant_id = ?`,
      [cartId, variantId],
    );
    await touchCart(conn, cartId, now);

    const items = await loadCart(conn, cartId);
    return NextResponse.json({
      ok: true,
      items,
      summary: cartTotals(items),
    } satisfies CartResponse);
  } catch (err) {
    console.error("[CART - ITEMS - DELETE]", err);
    return NextResponse.json(
      { error: "Could not remove this item" },
      { status: 500 },
    );
  } finally {
    conn.release();
  }
}
