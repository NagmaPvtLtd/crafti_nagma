# Cart — login-first, no guest carts

The cart belongs to a **signed-in user**. There is no guest cookie, no
`session_id` cart, and nothing is stored locally in the browser. Everything a
shopper puts in a cart is written to MySQL under their `users.id`, so it follows
them across devices.

Scope here: the cart only. Checkout, orders, payments, personalization and
wishlist sync are **not** implemented.

## Tables (already existed — no migration)

```sql
carts      (id, user_id, session_id, status, created_at, updated_at)
cart_items (id, cart_id, variant_id, quantity, personalization_data, …)
```

- `carts.user_id` is the only owner column used.
- `carts.status = 'active'` is the user's live cart. `uq_carts_user_active
  (user_id, status)` makes it one-per-user, which is what
  `resolveUserCart()` relies on for its duplicate-key race handling.
- **`carts.session_id` is reserved and unused.** It exists for a possible guest
  cart before login, which this feature deliberately does not build. Do not read
  or write it from cart code.
- `cart_items.personalization_data` is unused this turn; checkout/personalization
  will own it later.
- `uq_cart_variant (cart_id, variant_id)` means one line per variant; adding the
  same variant again increments the line's `quantity`.

## The login-first rule

| Where | Guest | Signed in |
|---|---|---|
| `POST /api/user/cart/items` | 401 from `src/proxy.ts` | Adds / increments |
| `GET /api/user/cart` | 401 | Cart + items + summary |
| `/cart` page | 307 → `/login?callbackUrl=%2Fcart` | Renders the cart |

`CollectionProduct.tsx` reacts to the 401 by navigating to

```
/login?callbackUrl=<product path>%3Fvariant%3D<sku>%26addCart%3D<variantId>%26qty%3D<n>
```

The Google button in `LoginClient` already honours `callbackUrl`, so after the
round-trip the shopper lands back on the same product with the item still queued.

### `addCart` / `qty` contract

The product page reads two query params on mount:

| Param | Value | Meaning |
|---|---|---|
| `addCart` | `product_variants.id` | Add this variant once the page opens |
| `qty` | integer 1–99 (optional) | How many; defaults to 1 |

- A ref guard (`autoAddRef`) makes the add happen **exactly once** per mount, so
  React strict-mode double effects and re-renders cannot add twice.
- The POST runs, then `router.replace()` rewrites the URL **without** `addCart`
  and `qty`, keeping any `variant` param the page added. Refreshing or sharing
  the resulting URL never re-adds.
- The same params work for a manual Google sign-in round-trip: they are part of
  the URL, not client state.
- If the auto-add fails (e.g. stock ran out while they were signing in), the
  server's message is toasted, the params are still cleaned up, and the shopper
  is left on the clean product page.

## Endpoints

All live under `/api/user/cart` — already guarded by `src/proxy.ts` (401 JSON for
guests), and each handler calls `requireAuth()` so it has a trusted
`session.user.id`. Responses are `Cache-Control: no-store`.

| Endpoint | Behaviour | Errors |
|---|---|---|
| `GET /api/user/cart` | Creates the active cart lazily; returns items + summary. A brand-new user gets an empty cart, never a 404. | 401, 500 |
| `POST /api/user/cart/items` | Body `{ variantId, quantity? }`. Adds a new line or increments the existing one. | 400 validation, 400 `"Out of stock"`, 400 `"Only N left"`, 409 missing/inactive variant, 401, 500 |
| `PATCH /api/user/cart/items/[variantId]` | Body `{ quantity }` 0–99. `0` deletes the line. Setting 1–99 is stock-checked. | 400 validation/`"Only N left"`, 404 line not in cart, 409 missing/inactive variant, 401, 500 |
| `DELETE /api/user/cart/items/[variantId]` | Removes one line. Idempotent. | 400 bad id, 401, 500 |
| `DELETE /api/user/cart` | Empties the cart, keeps the cart row. Idempotent. | 401, 500 |

Every mutation returns the **whole** cart (`{ ok, items, summary }`), so the UI
never needs a second fetch. Every mutation also bumps `carts.updated_at` through
`touchCart()`.

`POST` and the positive-quantity `PATCH` run inside a transaction with the line
selected `FOR UPDATE`, so two tabs adding the same variant cannot oversell it.

## Stock and availability

`CartItemView` carries both the cart quantity and the variant's live state:

- `available = status === "active" && stock > 0`.
- **Add / increment:** a missing or inactive variant is `409`; an active variant
  with `stock <= 0` is `400 "Out of stock"`; a quantity that would push the line
  past stock is `400 "Only N left"` with `N = stock`.
- **Update:** the same checks apply to a positive quantity. `0` is always allowed
  — a shopper must be able to remove a line whose variant was pulled.
- **Totals:** `cartTotals()` counts only `available` lines. Inactive and sold-out
  lines stay visible (greyed, with the reason) but add nothing to `itemCount`,
  `quantity` or `subtotal`.
- The cart page never lets a stepper exceed `min(99, stock)`.

Prices and stock are read from `product_variants` on every load; the cart stores
no price snapshot. An order will snapshot at checkout, not here.

## Photos

`loadCart()` follows `README_THUMBNAILS.md` §1: the variant's first photo
(`entity_type = 'product_variant'`, `file_purpose = 'product_variant_image'`,
`ORDER BY sort_order, created_at, id`), falling back to the product's first photo
(`entity_type = 'product'`), and `null` when neither exists. The page renders
the `Flower2` placeholder for `null`, like the rest of the storefront.

## Files

| File | Role |
|---|---|
| `src/types/Cart.types.ts` | `CartItemView`, `CartSummary`, `CartResponse` |
| `src/utils/Cart/cart.util.ts` | `resolveUserCart`, `touchCart`, `loadCart`, `cartTotals` |
| `src/utils/zod/cart/cart.zod.ts` | `cartAddSchema`, `cartUpdateSchema` |
| `src/app/api/user/cart/**` | Route handlers |
| `src/app/cart/page.tsx` | Thin route, `metadata.title = "Cart · Crafti Nagma"` |
| `src/app/(components)/Pages/CartClient.tsx` | Cart UI |
| `src/app/(components)/Navbar/CartBadge.tsx` | Navbar count bubble |
| `src/app/(components)/Pages/CollectionProduct.tsx` | Add flow + login redirect + `addCart` consumer |

## Client event

Mutations dispatch a browser event so the navbar badge stays in sync without a
shared store:

```ts
window.dispatchEvent(new CustomEvent("cart:updated"));
```

`CartBadge` fetches `GET /api/user/cart` on mount and on `cart:updated`. A 401
(guest) just hides the bubble — the `/cart` link itself stays.

## Not in this turn

Guest carts (`session_id`), checkout/orders, payments, per-item
personalization, wishlist ↔ cart sync.
