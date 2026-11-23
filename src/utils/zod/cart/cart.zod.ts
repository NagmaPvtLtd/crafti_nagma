import { z } from "zod";

const variantId = z
  .string()
  .trim()
  .min(2, "A variant is required")
  .max(40, "That variant reference is not valid");

/** `POST /api/user/cart/items` — quantity defaults to 1. */
export const cartAddSchema = z.object({
  variantId,
  quantity: z.number().int().min(1).max(99).default(1),
});

/** `PATCH /api/user/cart/items/[variantId]` — 0 removes the line. */
export const cartUpdateSchema = z.object({
  quantity: z.number().int().min(0).max(99),
});

export type CartAddInput = z.infer<typeof cartAddSchema>;
export type CartUpdateInput = z.infer<typeof cartUpdateSchema>;
