import { z } from "zod";

export const optionIdSchema = z
  .string()
  .trim()
  .min(10, "Invalid id")
  .max(40, "Invalid id");

const optionFields = {
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),

  description: z
    .string()
    .trim()
    .max(255, "Description must be at most 255 characters")
    .optional()
    .transform((v) => v ?? ""),
};

export const optionCreateSchema = z.object(optionFields);

export const optionUpdateSchema = z.object({
  ...optionFields,
  id: optionIdSchema,
});

export const optionDeleteSchema = z.object({ id: optionIdSchema });

const valueFields = {
  value: z
    .string()
    .trim()
    .min(1, "Value is required")
    .max(100, "Value must be at most 100 characters"),
};

export const optionValueCreateSchema = z.object({
  ...valueFields,
  optionId: optionIdSchema,
});

export const optionValueUpdateSchema = z.object({
  ...valueFields,
  id: optionIdSchema,
});

export const optionValueDeleteSchema = z.object({ id: optionIdSchema });

export type OptionCreateInput = z.infer<typeof optionCreateSchema>;
export type OptionUpdateInput = z.infer<typeof optionUpdateSchema>;
export type OptionValueCreateInput = z.infer<typeof optionValueCreateSchema>;

/** Shape returned by GET /api/manager/product-studio/options. */
export type GlobalOptionValue = {
  id: string;
  value: string;
  /**
   * How many product option rows (`product_option_values`) still point at this
   * value. `0` means it is safe to delete, even when the parent option itself is
   * assigned to products.
   */
  productCount: number;
};

export type GlobalOption = {
  id: string;
  name: string;
  description: string;
  valueCount: number;
  productCount: number;
  values: GlobalOptionValue[];
  createdAt: string;
  updatedAt: string | null;
};

export type GlobalOptionsResponse = {
  ok: true;
  counts: {
    options: number;
    values: number;
    productsUsing: number;
  };
  options: GlobalOption[];
};
