/**
 * Cart.types.ts
 *
 * Shapes shared by `/api/user/cart` and the cart UI.
 */

export type CartItemView = {
  variantId: string;
  sku: string;
  productName: string;
  productCode: string;
  /** Display name — the variant's own name, falling back to the product's. */
  name: string;
  imageUrl: string | null;
  price: number;
  compareAtPrice: number | null;
  quantity: number;
  lineTotal: number;
  stock: number;
  status: "active" | "inactive";
  /** `status === "active" && stock > 0` — only these count towards the totals. */
  available: boolean;
};

export type CartSummary = {
  /** Available lines, not the sum of quantities. */
  itemCount: number;
  quantity: number;
  subtotal: number;
};

export type CartResponse = {
  ok: true;
  items: CartItemView[];
  summary: CartSummary;
};
