import { z } from "zod";

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v ?? "");

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const productCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(
      /^[A-Z0-9-_]+$/,
      "Use uppercase letters, digits, dash or underscore",
    ),

  name: z.string().trim().min(2).max(255),

  slug: z
    .string()
    .trim()
    .min(2)
    .max(255)
    .regex(slugRegex, "Lowercase words separated by dashes"),

  briefDescription: optionalTrimmed(500),
  description: optionalTrimmed(20000),

  metaTitle: optionalTrimmed(255),
  metaDescription: optionalTrimmed(500),

  deliveryCharges: z.coerce.number().min(0).max(100000).default(0),
  processingTime: optionalTrimmed(100),

  isFeatured: z.boolean().default(false),
  mainShowcase: z.boolean().default(false),

  status: z.enum(["active", "inactive"]).default("active"),

  categoryIds: z.array(z.string().min(10).max(40)).default([]),

  firstVariant: z
    .object({
      name: optionalTrimmed(150),
      description: optionalTrimmed(500),
      sku: z.string().trim().min(2).max(100),
      price: z.coerce.number().min(0).max(10_000_000),
      compareAtPrice: z.coerce.number().min(0).max(10_000_000).nullish(),
      stock: z.coerce.number().int().min(0).max(100_000).default(0),
      weight: z.coerce.number().min(0).max(100_000).nullish(),
    })
    .optional(),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
