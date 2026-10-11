import { z } from "zod";

/**
 * Google OAuth profile — only the fields we consume.
 *
 * `.transform()` normalises in place so the caller gets trimmed,
 * length-clamped values without a separate sanitize step.
 * Google occasionally emits `null` for `name` on workspace accounts,
 * so it's optional and falls back to "Customer" downstream.
 */
export const googleProfileSchema = z.object({
  sub: z
    .string()
    .trim()
    .min(1, "google sub is required")
    .max(255)
    .transform((v) => v),

  email: z.string().trim().toLowerCase().email("invalid email").max(320),

  name: z
    .string()
    .trim()
    .max(255)
    .optional()
    .nullable()
    .transform((v) => v ?? ""),

  picture: z
    .string()
    .trim()
    .url()
    .max(500)
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type GoogleProfileInput = z.infer<typeof googleProfileSchema>;
