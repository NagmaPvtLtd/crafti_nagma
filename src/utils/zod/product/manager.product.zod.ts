import { z } from "zod";

import { slugRegex } from "../../Slug/slug.util";

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v ?? "");

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

/* ------------------------------------------------------------------ */
/*  Base product — created from Product Studio › Add a product         */
/* ------------------------------------------------------------------ */

const optionalText = (max: number, message?: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((v) => v ?? "");

/** A dimension is optional; an empty string means "not measured" (NULL). */
export const optionalDimension = z
  .union([
    z.literal(""),
    z.null(),
    z.coerce
      .number()
      .min(0, "Dimensions cannot be negative")
      .max(100_000)
      .refine(
        (v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-9,
        "Use at most two decimal places",
      ),
  ])
  .optional()
  .transform((v) => (v === "" || v === undefined || v === null ? null : v));

export const optionalDimensionUnit = z
  .union([z.literal(""), z.null(), z.enum(["cm", "in"])])
  .optional()
  .transform((v) => (v === "" || v === undefined || v === null ? null : v));

export const dimensionFields = {
  length: optionalDimension,
  width: optionalDimension,
  height: optionalDimension,
  dimensionUnit: optionalDimensionUnit,
};

/** At least one measurement means a unit must be chosen. */
export const requireUnitWithDimensions = (data: {
  length: number | null;
  width: number | null;
  height: number | null;
  dimensionUnit: "cm" | "in" | null;
}) =>
  (data.length === null && data.width === null && data.height === null) ||
  data.dimensionUnit !== null;

/**
 * A base product is not purchasable — it only carries the shared data its
 * variants inherit. At least one category and one option (with at least one
 * value) are required so the base is always usable.
 */
export const baseProductCreateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(255),

    briefDescription: optionalText(500),
    description: optionalText(20000),

    metaTitle: optionalText(255),
    metaDescription: optionalText(500),

    deliveryCharges: z.coerce.number().min(0).max(100000).default(0),

    isFeatured: z.boolean().default(false),
    mainShowcase: z.boolean().default(false),

    status: z.enum(["active", "inactive"]).default("active"),

    categoryIds: z
      .array(z.string().trim().min(10).max(40))
      .min(1, "Pick at least one category"),

    ...dimensionFields,

    options: z
      .array(
        z.object({
          optionId: z.string().trim().min(10).max(40),
          valueIds: z
            .array(z.string().trim().min(10).max(40))
            .min(1, "Pick at least one value for this option"),
        }),
      )
      .min(1, "Pick at least one option"),

    /** Optional tags — inherited automatically by every variant. */
    tagIds: z
      .array(z.string().trim().min(10).max(40))
      .max(15, "A product can carry at most 15 tags")
      .default([]),
  })
  .refine(requireUnitWithDimensions, {
    message: "Pick a unit (cm or in) when a dimension is filled in",
    path: ["dimensionUnit"],
  });

export type BaseProductCreateInput = z.infer<typeof baseProductCreateSchema>;
