/**
 * Collection.types.ts
 *
 * Shapes shared by the public storefront (collections pages) and the
 * `/api/public/collections` endpoints.
 */

export type CollectionCategoryRef = {
  id: string;
  name: string;
  slug: string;
};

export type CollectionProduct = {
  id: string;
  code: string;
  name: string;
  slug: string;
  briefDescription: string | null;
  isFeatured: boolean;
  imageUrl: string | null;
  priceFrom: number | null;
  priceTo: number | null;
  compareAtPrice: number | null;
  totalStock: number;
  /** Rating across every review of the product (all variants combined). */
  reviews: { average: number; count: number };
  category: CollectionCategoryRef | null;
  subcategory: CollectionCategoryRef | null;
  /** `/collections/{category}/{subcategory}/{code}` */
  href: string;
};

export type CollectionCategory = {
  id: string;
  name: string;
  slug: string;
  /** Products attached to this exact category. */
  productCount: number;
  /** Products in this category plus all of its subcategories. */
  totalProductCount: number;
  /** Showcase photo for the category (featured variant first). */
  thumbnailUrl: string | null;
  subcategories: {
    id: string;
    name: string;
    slug: string;
    productCount: number;
    href: string;
  }[];
  href: string;
};

export type CollectionsResponse = {
  ok: true;
  featured: CollectionProduct[];
  categories: CollectionCategory[];
  products: CollectionProduct[];
  totalProducts: number;
  /** Catalogue-wide active-variant price bounds, for the search slider. */
  priceRange: { min: number; max: number };
  /** The search term that was served, when one was sent. */
  query: string | null;
  scope: {
    type: "all" | "category" | "subcategory";
    name: string;
    slug: string;
    found: boolean;
  } | null;
};

export type CollectionProductImage = {
  id: string;
  url: string;
  altText: string | null;
};

/** One product option (Colour, Size…) and the values a variant can pick. */
export type CollectionOption = {
  id: string;
  name: string;
  values: { id: string; value: string }[];
};

/** Optional physical dimensions, all sharing one unit. */
export type CollectionDimensions = {
  length: number | null;
  width: number | null;
  height: number | null;
  dimensionUnit: "cm" | "in" | null;
};

export type CollectionVariant = {
  id: string;
  sku: string;
  name: string | null;
  briefDescription: string | null;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  /** Always `0` when the manager hid the stock, so the page reads as sold out. */
  stock: number;
  /** This variant's own processing time, falling back to the product's. */
  processingTime: string | null;
  /** Smallest order the shopper may place (null = 1). */
  minOrderQty: number | null;
  /** Largest order the shopper may place (null = no limit). */
  maxOrderQty: number | null;
  /** Grams, as entered in the studio. */
  weight: number | null;
  /** This variant's own snapshot of the product dimensions. */
  dimensions: CollectionDimensions;
  status: "active" | "inactive";
  isFeatured: boolean;
  /** This variant's own feature bullets (falls back to the product's). */
  features: CollectionFeature[];
  /** This variant's own care instructions (falls back to the product's). */
  careInstructions: CollectionCareInstruction[];
  /** This variant's own photos, in display order. */
  images: CollectionProductImage[];
  /** `product_option_values.id` this variant fills — one per option. */
  optionValueIds: string[];
};

export type CollectionReviewSummary = {
  average: number;
  count: number;
};

export type CollectionFeature = {
  id: string;
  text: string;
};

export type CollectionCareInstruction = {
  id: string;
  text: string;
};

export type CollectionGiftItem = {
  id: string;
  text: string;
};

/** The SKU skeleton of a variant — just enough to pick one and fetch its data. */
export type CollectionVariantRef = {
  id: string;
  sku: string;
  status: "active" | "inactive";
  /** `product_option_values.id` this variant fills — one per option. */
  optionValueIds: string[];
};

export type CollectionProductDetail = {
  id: string;
  code: string;
  name: string;
  slug: string;
  briefDescription: string | null;
  description: string | null;
  processingTime: string | null;
  deliveryCharges: number;
  isFeatured: boolean;
  dimensions: CollectionDimensions;
  /** Product-level photos, used only when a variant has none of its own. */
  images: CollectionProductImage[];
  options: CollectionOption[];
  reviews: CollectionReviewSummary;
  features: CollectionFeature[];
  careInstructions: CollectionCareInstruction[];
  giftIncluded: CollectionGiftItem[];
  category: CollectionCategoryRef | null;
  subcategory: CollectionCategoryRef | null;
  href: string;
};

export type CollectionProductResponse = {
  ok: true;
  product: CollectionProductDetail;
  /** Full data of the one variant the page shows (requested by SKU). */
  variant: CollectionVariant | null;
  /** Every variant's SKU, so the option chips know what to request next. */
  variants: CollectionVariantRef[];
};
