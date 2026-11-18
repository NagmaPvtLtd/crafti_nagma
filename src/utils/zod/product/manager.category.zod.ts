import { z } from "zod";

import { slugRegex } from "../../Slug/slug.util";

/** Lowercase words separated by single dashes — shared slug shape. */
export const categorySlugRegex = slugRegex;

export const categoryIdSchema = z
  .string()
  .trim()
  .min(10, "Invalid category id")
  .max(40, "Invalid category id");

const categoryFields = {
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),

  /** Empty string means "generate one from the name". */
  slug: z
    .string()
    .trim()
    .max(120, "Slug must be at most 120 characters")
    .optional()
    .transform((v) => v ?? "")
    .refine((v) => v === "" || categorySlugRegex.test(v), {
      message: "Use lowercase letters, numbers and dashes",
    }),

  /** null / empty string = root category. */
  parentId: z
    .union([z.literal(""), z.literal(null), z.string().trim().min(10).max(40)])
    .optional()
    .transform((v) => (v ? v : null)),
};

export const categoryCreateSchema = z.object(categoryFields);

export const categoryUpdateSchema = z.object({
  ...categoryFields,
  id: categoryIdSchema,
});

export const categoryDeleteSchema = z.object({
  id: categoryIdSchema,
});

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;

/** Shape returned by GET /api/manager/product-studio/categories. */
export type GlobalCategory = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  productCount: number;
  subcategoryCount: number;
  createdAt: string;
  updatedAt: string | null;
};

export type GlobalCategoriesResponse = {
  ok: true;
  counts: {
    total: number;
    root: number;
    sub: number;
    productsAssigned: number;
  };
  categories: GlobalCategory[];
};
