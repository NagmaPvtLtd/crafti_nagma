import { z } from "zod";

import { MAX_CART_QUANTITY } from "../../Cart/cartLimit.util";
import {
  dimensionFields,
  requireUnitWithDimensions,
} from "./manager.product.zod";

export type ProductDimensions = {
  length: number | null;
  width: number | null;
  height: number | null;
  dimensionUnit: "cm" | "in" | null;
};

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v ?? "");

const id = z.string().trim().min(10).max(40);
const price = z.coerce.number().min(0).max(10_000_000);

/* ------------------------------------------------------------------ */
/*  Edit the base product                                              */
/* ------------------------------------------------------------------ */

/**
 * Editing a base product never changes its `slug` — that stays stable so links
 * keep working. `code` may be edited, but the route refuses one that is
 * already taken by another product.
 */
export const productBaseUpdateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(255),

    /** Omit to leave the stored code untouched. */
    code: z
      .string()
      .trim()
      .min(2, "Code must be at least 2 characters")
      .max(50, "Code must be at most 50 characters")
      .regex(
        /^[A-Z0-9-_]+$/,
        "Use uppercase letters, digits, dash or underscore",
      )
      .optional(),

    briefDescription: optionalText(500),
    description: optionalText(20000),

    metaTitle: optionalText(255),
    metaDescription: optionalText(500),

    deliveryCharges: z.coerce.number().min(0).max(100000).default(0),
    processingTime: optionalText(100),

    isFeatured: z.boolean().default(false),
    mainShowcase: z.boolean().default(false),

    status: z.enum(["active", "inactive"]).default("active"),

    /** When present the category set is replaced; omit to leave it untouched. */
    categoryIds: z.array(id).optional(),

    /** Full replacement of the feature bullets; omit to leave them untouched. */
    features: z.array(z.string().trim().min(1).max(255)).optional(),

    /** Full replacement of the care instructions; omit to leave them untouched. */
    careInstructions: z.array(z.string().trim().min(1).max(255)).optional(),

    /** Full replacement of the base product's tags; omit to leave them untouched. */
    tagIds: z
      .array(z.string().trim().min(10).max(40))
      .max(15, "A product can carry at most 15 tags")
      .optional(),

    ...dimensionFields,

    /**
     * Full replacement of the product's options and their values. Omit to leave
     * them untouched; removing a value removes the variants that use it (or
     * disables them when they already have orders).
     */
    options: z
      .array(
        z.object({
          optionId: z.string().trim().min(10).max(40),
          valueIds: z
            .array(z.string().trim().min(10).max(40))
            .min(1, "Pick at least one value for this option"),
        }),
      )
      .min(1, "Pick at least one option")
      .optional(),
  })
  .refine(requireUnitWithDimensions, {
    message: "Pick a unit (cm or in) when a dimension is filled in",
    path: ["dimensionUnit"],
  });

export type ProductBaseUpdateInput = z.infer<typeof productBaseUpdateSchema>;

/* ------------------------------------------------------------------ */
/*  Generate variants                                                  */
/* ------------------------------------------------------------------ */

export const generateVariantsSchema = z.object({
  /**
   * `all` builds the full cartesian product of the product's option values.
   * `selected` builds only the combinations sent in `combinations`
   * (each entry is one option-value id per option).
   */
  mode: z.enum(["all", "selected"]).default("all"),

  /** Used when mode is `selected`; one array of option-value ids per variant. */
  combinations: z.array(z.array(id).min(1).max(20)).max(200).optional(),

  startingPrice: price.default(100),
  compareAtPrice: price.nullish(),
  stock: z.coerce.number().int().min(0).max(100_000).default(0),
});

export type GenerateVariantsInput = z.infer<typeof generateVariantsSchema>;

/* ------------------------------------------------------------------ */
/*  Edit a variant                                                     */
/* ------------------------------------------------------------------ */

/**
 * Minimum copy lengths a variant must reach before it may be activated, plus
 * at least one photo (an upload or a shallow link). Shared by the API gate and
 * the variant page's hint so the two never drift apart.
 */
export const VARIANT_ACTIVATION_RULES = {
  name: 3,
  briefDescription: 10,
  description: 20,
} as const;

export const variantUpdateSchema = z
  .object({
    name: optionalText(150),
    briefDescription: optionalText(500),
    description: optionalText(500),

    price,
    compareAtPrice: price.nullish(),
    stock: z.coerce.number().int().min(0).max(100_000),
    weight: z.coerce.number().min(0).max(100_000).nullish(),

    status: z.enum(["active", "inactive"]).default("active"),
    isFeatured: z.boolean().default(false),
    mainShowcase: z.boolean().default(false),

    /**
     * This variant's own snapshot of the base product's processing time, so one
     * slow colour can say "2–3 weeks" while the rest stays "5–7 days".
     */
    processingTime: optionalText(100),

    /**
     * Show the variant as sold out on the storefront without changing the real
     * `stock` number — no more zeroing stock just to hide a piece.
     */
    hideStock: z.boolean().default(false),

    /** Smallest order the shopper may place. Empty means 1. */
    minOrderQty: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_CART_QUANTITY)
      .nullish(),

    /**
     * Largest order the shopper may place. Empty means no limit — only the
     * database's own quantity ceiling applies, never the stock count.
     */
    maxOrderQty: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_CART_QUANTITY)
      .nullish(),

    ...dimensionFields,

    /** Full replacement of the variant's own feature bullets; omit to leave them. */
    features: z.array(z.string().trim().min(1).max(255)).optional(),

    /** Full replacement of the variant's own care instructions; omit to leave them. */
    careInstructions: z.array(z.string().trim().min(1).max(255)).optional(),

    /**
     * Full replacement of the variant's own (additional) tags; omit to leave
     * them. Inherited base-product tags live in their own mapping table and are
     * never written here.
     */
    tagIds: z
      .array(z.string().trim().min(10).max(40))
      .max(15, "A variant can carry at most 15 additional tags")
      .optional(),
  })
  .refine(requireUnitWithDimensions, {
    message: "Pick a unit (cm or in) when a dimension is filled in",
    path: ["dimensionUnit"],
  })
  .refine(
    (value) =>
      value.minOrderQty == null ||
      value.maxOrderQty == null ||
      value.maxOrderQty >= value.minOrderQty,
    {
      message: "Maximum order must be at least the minimum order",
      path: ["maxOrderQty"],
    },
  );

export type VariantUpdateInput = z.infer<typeof variantUpdateSchema>;

/* ------------------------------------------------------------------ */
/*  Shallow image linking                                              */
/* ------------------------------------------------------------------ */

/** Attach photos that already exist on a sibling variant. */
export const linkExistingImagesSchema = z.object({
  imageIds: z.array(id).min(1, "Pick at least one photo").max(60),
});

export type LinkExistingImagesInput = z.infer<typeof linkExistingImagesSchema>;

/* ------------------------------------------------------------------ */
/*  Response types                                                     */
/* ------------------------------------------------------------------ */

export type ProductStatus = "active" | "inactive";

export interface ProductListCounts {
  total: number;
  active: number;
  inactive: number;
  withoutVariants: number;
}

export interface ProductListItem {
  id: string;
  code: string;
  name: string;
  slug: string;
  status: ProductStatus;
  isFeatured: boolean;
  mainShowcase: boolean;
  variantCount: number;
  totalStock: number;
  minPrice: number | null;
  maxPrice: number | null;
  imageUrl: string | null;
  updatedAt: string | null;
}

export interface ProductListResponse {
  ok: true;
  counts: ProductListCounts;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  products: ProductListItem[];
}

export interface ProductCategoryRef {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

export interface ProductOptionValueRef {
  id: string;
  /** `global_option_values.id` this value was copied from. */
  globalOptionValueId: string;
  value: string;
}

export interface ProductOptionGroup {
  id: string;
  /** `global_options.id` this option was copied from. */
  globalOptionId: string;
  name: string;
  description: string;
  values: ProductOptionValueRef[];
}

export interface ProductMediaItem {
  id: string;
  url: string;
  fileId: string;
  altText: string;
  sortOrder: number;
  variantId: string | null;
  createdAt: string;
  /** True when this row is a link to another variant's upload. */
  isLinked: boolean;
  /** `imagekit_files.id` of the original upload, when this row is a link. */
  sourceImageId: string | null;
  /** Variant that originally uploaded the file (links only). */
  ownerVariantName: string | null;
  ownerSku: string | null;
  /** How many variants currently link the original. */
  linkedVariantCount: number;
}

export interface AvailableImageItem {
  id: string;
  url: string;
  altText: string;
  alreadyLinked: boolean;
}

export interface AvailableImageGroup {
  variantId: string;
  variantName: string;
  sku: string;
  images: AvailableImageItem[];
}

export interface AvailableImagesResponse {
  ok: true;
  groups: AvailableImageGroup[];
}

export interface ProductVariantSummary {
  id: string;
  name: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  /** Shown as out of stock on the storefront while the stock count stays. */
  hideStock: boolean;
  minOrderQty: number | null;
  maxOrderQty: number | null;
  status: ProductStatus;
  optionValues: { option: string; value: string }[];
  /** `product_option_values.id` this variant fills — one per option. */
  optionValueIds: string[];
  imageUrl: string | null;
}

export interface ProductDetailStats {
  variantCount: number;
  totalStock: number;
  lowStock: number;
  outOfStock: number;
  minPrice: number | null;
  maxPrice: number | null;
  orders: number;
  unitsSold: number;
  revenue: number;
  reviewCount: number;
  averageRating: number | null;
}

export interface ProductReviewItem {
  id: string;
  reviewerName: string;
  rating: number;
  title: string;
  comment: string;
  isApproved: boolean;
  createdAt: string;
  variantId: string | null;
}

export interface ProductLineItem {
  id: string;
  value: string;
  sortOrder: number;
}

export interface ProductDetail {
  id: string;
  code: string;
  name: string;
  slug: string;
  briefDescription: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  deliveryCharges: number;
  processingTime: string;
  isFeatured: boolean;
  mainShowcase: boolean;
  status: ProductStatus;
  dimensions: ProductDimensions;
  createdAt: string;
  updatedAt: string | null;
}

export interface ProductDetailResponse {
  ok: true;
  product: ProductDetail;
  /** Base product tags — inherited by every variant. */
  tags: ProductTagRef[];
  features: ProductLineItem[];
  careInstructions: ProductLineItem[];
  categories: ProductCategoryRef[];
  options: ProductOptionGroup[];
  variants: ProductVariantSummary[];
  media: ProductMediaItem[];
  stats: ProductDetailStats;
  reviews: ProductReviewItem[];
}

/* ------------------------------------------------------------------ */
/*  Variant detail                                                     */
/* ------------------------------------------------------------------ */

export interface VariantDetail {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  name: string;
  briefDescription: string;
  description: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  /** The real count is kept; the storefront reads this flag as "out of stock". */
  hideStock: boolean;
  /** This variant's own processing time (empty until synced from the base). */
  processingTime: string;
  minOrderQty: number | null;
  maxOrderQty: number | null;
  weight: number | null;
  status: ProductStatus;
  isFeatured: boolean;
  mainShowcase: boolean;
  dimensions: ProductDimensions;
  ordersCount: number;
  orderStats: {
    orders: number;
    unitsSold: number;
    revenue: number;
  };
  createdAt: string;
  updatedAt: string | null;
}

export interface VariantDetailResponse {
  ok: true;
  variant: VariantDetail;
  /** Inherited base tags and the variant's own additional tags. */
  tags: {
    inherited: ProductTagRef[];
    additional: ProductTagRef[];
  };
  optionValues: { option: string; value: string }[];
  media: ProductMediaItem[];
  /** This variant's own snapshot of the base product's lists. */
  features: ProductLineItem[];
  careInstructions: ProductLineItem[];
  /** Base product copy — what the sync buttons on the variant form pull from. */
  baseProduct: {
    name: string;
    briefDescription: string;
    description: string;
    /** What the processing-time sync button copies into the variant. */
    processingTime: string;
    dimensions: ProductDimensions;
    features: string[];
    careInstructions: string[];
    tags: ProductTagRef[];
  };
}

export interface ProductTagRef {
  id: string;
  name: string;
  slug: string;
}
