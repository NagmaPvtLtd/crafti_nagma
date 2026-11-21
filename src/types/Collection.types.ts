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

export type CollectionVariant = {
  id: string;
  sku: string;
  name: string | null;
  briefDescription: string | null;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  /** Grams, as entered in the studio. */
  weight: number | null;
  status: "active" | "inactive";
  isFeatured: boolean;
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
