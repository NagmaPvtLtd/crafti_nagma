/* eslint-disable @next/next/no-img-element -- ImageKit already serves sized images */
"use client";

import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Boxes,
  Check,
  ChevronRight,
  ImagePlus,
  IndianRupee,
  Layers,
  Loader2,
  Package,
  Pencil,
  RefreshCw,
  Sparkles,
  Star,
  TrendingUp,
  Wand2,
} from "lucide-react";

import getAxiosErrorMessage from "../../../../utils/Auth/Auth.axiosErrorHelper.util";
import PageWrapper from "../../utils/PageWrapper";
import { SectionDivider, SectionEyebrow } from "../../utils/SectionDiv";
import CustomLoader from "../../CustomLoader";
import Field from "../../utils/Form/Field";
import TextInput from "../../utils/Form/TextInput";
import Textarea from "../../utils/Form/Textarea";
import StudioModal from "./StudioModal";
import PricingQuizButton from "./PricingQuizModal";
import ProductMediaManager, { MediaGallery } from "./ProductMediaManager";
import { suggestPrice } from "../../../../utils/Pricing/pricing.util";
import type {
  ProductDetailResponse,
  ProductMediaItem,
  ProductVariantSummary,
} from "../../../../utils/zod/product/manager.productDetail.zod";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CATEGORIES_URL = "/api/manager/product-studio/categories";

type CategoryOption = {
  id: string;
  name: string;
  parentId: string | null;
};

type EditForm = {
  name: string;
  briefDescription: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  deliveryCharges: string;
  status: "active" | "inactive";
  isFeatured: boolean;
  mainShowcase: boolean;
  categoryIds: string[];
};

const inr = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ProductDetailClient({ productId }: { productId: string }) {
  const [data, setData] = useState<ProductDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [allCategories, setAllCategories] = useState<CategoryOption[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<ProductDetailResponse>(
        `/api/manager/product-studio/${productId}`,
        { withCredentials: true },
      );
      setData(res.data);
    } catch (err) {
      setError(getAxiosErrorMessage(err, "Failed to load the product"));
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    const ahem = () => {
      void load();
    };
    ahem();
  }, [load]);

  useEffect(() => {
    let active = true;

    axios
      .get<{ categories: CategoryOption[] }>(CATEGORIES_URL, {
        withCredentials: true,
      })
      .then((res) => {
        if (active) setAllCategories(res.data.categories ?? []);
      })
      .catch(() => {
        /* category editing is optional — the rest of the form still works */
      });

    return () => {
      active = false;
    };
  }, []);

  const baseImages = useMemo<ProductMediaItem[]>(
    () => (data ? data.media.filter((item) => item.variantId === null) : []),
    [data],
  );

  const imagesByVariant = useMemo(() => {
    const map = new Map<string, ProductMediaItem[]>();
    for (const item of data?.media ?? []) {
      if (!item.variantId) continue;
      const list = map.get(item.variantId) ?? [];
      list.push(item);
      map.set(item.variantId, list);
    }
    return map;
  }, [data]);

  const comboCount = useMemo(() => {
    if (!data || data.options.length === 0) return 0;
    return data.options.reduce(
      (total, option) => total * Math.max(option.values.length, 1),
      1,
    );
  }, [data]);

  return (
    <PageWrapper variant="content" position="fixed">
      <div className="relative flex flex-col overflow-hidden text-stone-800">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-rose-200/40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/3 -left-32 h-80 w-80 rounded-full bg-rose-100/60 blur-3xl"
        />

        {/* Header */}
        <section className="relative">
          <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 sm:pt-10">
            <Link
              href="/manager/product-studio/products"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 transition-colors hover:text-rose-600"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All products
            </Link>

            {data ? (
              <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <SectionEyebrow>Product overview</SectionEyebrow>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
                      {data.product.name}
                    </h1>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${
                        data.product.status === "active"
                          ? "border-emerald-200/70 bg-emerald-50 text-emerald-700"
                          : "border-stone-200/70 bg-stone-50 text-stone-600"
                      }`}
                    >
                      {data.product.status}
                    </span>
                    {data.product.isFeatured && (
                      <span className="rounded-full border border-amber-200/70 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-700 uppercase">
                        Featured
                      </span>
                    )}
                    {data.product.mainShowcase && (
                      <span className="rounded-full border border-violet-200/70 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-violet-700 uppercase">
                        Showcase
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-stone-400">
                    {data.product.code} · /{data.product.slug}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => void load()}
                    disabled={loading}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-rose-200/70 bg-white/70 px-3 py-1.5 text-xs font-semibold text-rose-600 backdrop-blur-sm transition-colors hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                    />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                  <button
                    onClick={() => setEditOpen(true)}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit product
                  </button>
                  <button
                    onClick={() => setGenerateOpen(true)}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-rose-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-rose-500/25 transition-colors hover:bg-rose-600"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    Generate variants
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 h-9 w-64 animate-pulse rounded-full bg-stone-200/70" />
            )}
          </div>
        </section>

        <SectionDivider className="mx-auto max-w-7xl px-4 sm:px-6" />

        {/* Body */}
        <section className="relative">
          <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16">
            {loading && !data && (
              <CustomLoader fullScreen={false} label="Loading the product…" />
            )}

            {error && !loading && (
              <div className="flex items-start gap-3 rounded-2xl border border-rose-200/70 bg-rose-50 px-4 py-3.5 sm:rounded-3xl sm:px-5 sm:py-4">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-rose-800">
                    Couldn&apos;t load the product
                  </p>
                  <p className="mt-0.5 text-xs text-rose-700">{error}</p>
                </div>
                <button
                  onClick={() => void load()}
                  className="shrink-0 cursor-pointer rounded-full border border-rose-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                >
                  Retry
                </button>
              </div>
            )}

            {data && !error && (
              <div className="space-y-5 sm:space-y-6">
                <StatsStrip stats={data.stats} />

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                  <section className="lg:col-span-5">
                    <div className="h-full rounded-2xl border border-white/60 bg-white/85 p-4 backdrop-blur-sm sm:rounded-3xl sm:p-5">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div>
                          <SectionEyebrow>Media</SectionEyebrow>
                          <h2 className="mt-1 text-sm font-semibold text-stone-900">
                            Base product photos
                          </h2>
                        </div>
                        <button
                          onClick={() => setMediaOpen(true)}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-rose-200/70 bg-rose-50/60 px-2.5 py-1 text-[11px] font-semibold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50"
                        >
                          <ImagePlus className="h-3 w-3" />
                          Manage
                        </button>
                      </div>

                      <MediaGallery
                        images={baseImages}
                        alt={data.product.name}
                        emptyLabel="No base images yet — add the shots every variant inherits."
                      />
                    </div>
                  </section>

                  <section className="lg:col-span-7">
                    <BaseDetails data={data} />
                  </section>
                </div>

                <VariantsSection
                  variants={data.variants}
                  imagesByVariant={imagesByVariant}
                  productId={productId}
                  onGenerate={() => setGenerateOpen(true)}
                />

                <ReviewsSection
                  reviews={data.reviews}
                  averageRating={data.stats.averageRating}
                  reviewCount={data.stats.reviewCount}
                />
              </div>
            )}
          </div>
        </section>

        {data && (
          <>
            {/* Mounted only while open so the form starts from fresh props. */}
            {editOpen && (
              <EditProductModal
                open
                onClose={() => setEditOpen(false)}
                product={data}
                categories={allCategories}
                onSaved={() => {
                  setEditOpen(false);
                  void load();
                }}
              />
            )}

            {generateOpen && (
              <GenerateVariantsModal
                open
                onClose={() => setGenerateOpen(false)}
                product={data}
                comboCount={comboCount}
                onGenerated={() => {
                  setGenerateOpen(false);
                  void load();
                }}
              />
            )}

            <ProductMediaManager
              open={mediaOpen}
              onClose={() => setMediaOpen(false)}
              productId={productId}
              images={baseImages}
              onChange={() => void load()}
              title="Base product images"
            />
          </>
        )}
      </div>
    </PageWrapper>
  );
}

/* ================================================================== */
/*  Stats strip                                                       */
/* ================================================================== */

function StatsStrip({ stats }: { stats: ProductDetailResponse["stats"] }) {
  const priceLabel =
    stats.minPrice === null
      ? "—"
      : stats.maxPrice !== null && stats.maxPrice !== stats.minPrice
        ? `${inr(stats.minPrice)} – ${inr(stats.maxPrice)}`
        : inr(stats.minPrice);

  const items = [
    {
      label: "Variants",
      value: String(stats.variantCount),
      hint:
        stats.variantCount === 0
          ? "Not generated yet"
          : `${stats.lowStock} low · ${stats.outOfStock} out`,
      icon: <Layers className="h-3.5 w-3.5" />,
    },
    {
      label: "Stock",
      value: stats.totalStock.toLocaleString("en-IN"),
      hint: "Units across variants",
      icon: <Boxes className="h-3.5 w-3.5" />,
    },
    {
      label: "Price",
      value: priceLabel,
      hint: "Variant price range",
      icon: <IndianRupee className="h-3.5 w-3.5" />,
    },
    {
      label: "Orders",
      value: stats.orders.toLocaleString("en-IN"),
      hint: "Non-cancelled orders",
      icon: <Package className="h-3.5 w-3.5" />,
    },
    {
      label: "Units sold",
      value: stats.unitsSold.toLocaleString("en-IN"),
      hint: "Across all variants",
      icon: <TrendingUp className="h-3.5 w-3.5" />,
    },
    {
      label: "Revenue",
      value: inr(stats.revenue),
      hint: "Order item totals",
      icon: <IndianRupee className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-white/60 bg-white/85 px-3 py-3 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:bg-white hover:shadow-lg hover:shadow-rose-100/60 sm:rounded-3xl sm:px-4 sm:py-3.5"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-stone-900">{item.icon}</span>
            <p className="truncate text-[10px] font-semibold tracking-wider text-rose-500/80 uppercase">
              {item.label}
            </p>
          </div>
          <p className="mt-1.5 truncate text-sm font-semibold tabular-nums text-stone-900 sm:text-base">
            {item.value}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-stone-400">
            {item.hint}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  Base details                                                      */
/* ================================================================== */

function BaseDetails({ data }: { data: ProductDetailResponse }) {
  const { product } = data;

  return (
    <div className="h-full rounded-2xl border border-white/60 bg-white/85 p-4 backdrop-blur-sm sm:rounded-3xl sm:p-5">
      <SectionEyebrow>Base product</SectionEyebrow>
      <h2 className="mt-1 text-sm font-semibold text-stone-900">
        Product details
      </h2>

      <p className="mt-3 text-sm leading-relaxed text-stone-700">
        {product.briefDescription || "No short description yet."}
      </p>

      {product.description && (
        <p className="mt-2 text-xs leading-relaxed whitespace-pre-line text-stone-500">
          {product.description}
        </p>
      )}

      <div className="mt-4">
        <p className="text-[10px] font-semibold tracking-wider text-stone-500 uppercase">
          Categories
        </p>
        {data.categories.length === 0 ? (
          <p className="mt-1 text-xs text-stone-400">No categories assigned.</p>
        ) : (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {data.categories.map((category) => (
              <span
                key={category.id}
                className="rounded-full border border-rose-200/70 bg-rose-50/60 px-2 py-0.5 text-[10px] font-medium text-rose-600"
              >
                {category.parentId ? "↳ " : ""}
                {category.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="text-[10px] font-semibold tracking-wider text-stone-500 uppercase">
          Options
        </p>
        {data.options.length === 0 ? (
          <p className="mt-1 text-xs text-stone-400">No options attached.</p>
        ) : (
          <div className="mt-1.5 space-y-2">
            {data.options.map((option) => (
              <div key={option.id} className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-stone-700">
                  {option.name}
                </span>
                <span className="text-stone-300">·</span>
                {option.values.map((value) => (
                  <span
                    key={value.id}
                    className="rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[10px] text-stone-600"
                  >
                    {value.value}
                  </span>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-stone-100 pt-3 text-xs">
        <DetailRow label="Delivery" value={inr(product.deliveryCharges)} />
        <DetailRow label="Status" value={product.status} capitalize />
        <DetailRow
          label="Featured"
          value={product.isFeatured ? "Yes" : "No"}
        />
        <DetailRow
          label="Showcase"
          value={product.mainShowcase ? "Yes" : "No"}
        />
        <DetailRow label="Created" value={fmtDate(product.createdAt)} />
        <DetailRow label="Updated" value={fmtDate(product.updatedAt)} />
      </dl>

      {(product.metaTitle || product.metaDescription) && (
        <div className="mt-3 border-t border-stone-100 pt-3">
          <p className="text-[10px] font-semibold tracking-wider text-stone-500 uppercase">
            SEO
          </p>
          {product.metaTitle && (
            <p className="mt-1 text-xs font-medium text-stone-700">
              {product.metaTitle}
            </p>
          )}
          {product.metaDescription && (
            <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500">
              {product.metaDescription}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  capitalize = false,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-[10px] font-semibold tracking-wider text-stone-400 uppercase">
        {label}
      </dt>
      <dd
        className={`truncate text-right text-[11px] font-medium text-stone-700 ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

/* ================================================================== */
/*  Variants                                                          */
/* ================================================================== */

function VariantsSection({
  variants,
  imagesByVariant,
  productId,
  onGenerate,
}: {
  variants: ProductVariantSummary[];
  imagesByVariant: Map<string, ProductMediaItem[]>;
  productId: string;
  onGenerate: () => void;
}) {
  return (
    <section className="rounded-2xl border border-white/60 bg-white/85 p-4 backdrop-blur-sm sm:rounded-3xl sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <SectionEyebrow>Purchasable</SectionEyebrow>
          <h2 className="mt-1 text-sm font-semibold text-stone-900">
            Variants{" "}
            <span className="font-normal text-stone-400">
              ({variants.length})
            </span>
          </h2>
          <p className="mt-0.5 text-[11px] text-stone-500">
            Each variant is what the customer actually buys.
          </p>
        </div>
        <button
          onClick={onGenerate}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-rose-500 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm shadow-rose-500/25 transition-colors hover:bg-rose-600"
        >
          <Wand2 className="h-3 w-3" />
          {variants.length === 0 ? "Generate variants" : "Regenerate"}
        </button>
      </div>

      {variants.length === 0 ? (
        <div className="mt-3 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-rose-200/70 bg-rose-50/30 py-9 text-center">
          <Layers className="h-5 w-5 text-rose-400" />
          <p className="text-sm font-semibold text-stone-800">
            No variants yet
          </p>
          <p className="max-w-sm text-[11px] leading-relaxed text-stone-500">
            Generate one variant per combination of this product&apos;s option
            values. SKUs are built from the product code and the values.
          </p>
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-stone-100">
          {variants.map((variant) => (
            <li key={variant.id}>
              <Link
                href={`/manager/product-studio/products/${productId}/variants/${variant.id}`}
                className="group flex items-center gap-3 py-2.5"
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                  {imagesByVariant.get(variant.id)?.[0] ? (
                    <img
                      src={imagesByVariant.get(variant.id)![0].url}
                      alt={variant.name || variant.sku}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-stone-300">
                      <Layers className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-stone-900">
                    {variant.name || variant.sku}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1">
                    {variant.optionValues.map((value) => (
                      <span
                        key={`${value.option}-${value.value}`}
                        className="rounded-full border border-stone-200 bg-white px-1.5 py-0.5 text-[9px] text-stone-500"
                      >
                        {value.value}
                      </span>
                    ))}
                    <span className="font-mono text-[9px] text-stone-400">
                      {variant.sku}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-xs font-semibold tabular-nums text-stone-900">
                    {inr(variant.price)}
                  </p>
                  <p className="text-[10px] text-stone-500">
                    {variant.stock} in stock
                  </p>
                </div>

                <span
                  className={`hidden shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize sm:inline ${
                    variant.status === "active"
                      ? "border-emerald-200/70 bg-emerald-50 text-emerald-700"
                      : "border-stone-200/70 bg-stone-50 text-stone-600"
                  }`}
                >
                  {variant.status}
                </span>

                <ChevronRight className="h-4 w-4 shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-rose-500" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ================================================================== */
/*  Reviews                                                           */
/* ================================================================== */

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${
            i < Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "text-stone-200"
          }`}
        />
      ))}
    </span>
  );
}

function ReviewsSection({
  reviews,
  averageRating,
  reviewCount,
}: {
  reviews: ProductDetailResponse["reviews"];
  averageRating: number | null;
  reviewCount: number;
}) {
  return (
    <section className="rounded-2xl border border-white/60 bg-white/85 p-4 backdrop-blur-sm sm:rounded-3xl sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <SectionEyebrow>Feedback</SectionEyebrow>
          <h2 className="mt-1 text-sm font-semibold text-stone-900">
            Reviews{" "}
            <span className="font-normal text-stone-400">({reviewCount})</span>
          </h2>
        </div>
        {averageRating !== null && (
          <span className="inline-flex items-center gap-1.5 text-xs text-stone-600">
            <Stars rating={averageRating} />
            <span className="font-semibold tabular-nums text-stone-900">
              {averageRating.toFixed(1)}
            </span>
          </span>
        )}
      </div>

      {reviews.length === 0 ? (
        <div className="mt-3 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 py-9 text-center">
          <Star className="h-5 w-5 text-stone-300" />
          <p className="text-sm font-semibold text-stone-800">
            No reviews yet
          </p>
          <p className="max-w-sm text-[11px] leading-relaxed text-stone-500">
            Customer reviews for this product will appear here once they start
            coming in.
          </p>
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-stone-100">
          {reviews.map((review) => (
            <li key={review.id} className="py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold text-stone-900">
                  {review.reviewerName}
                </p>
                <Stars rating={review.rating} />
                {!review.isApproved && (
                  <span className="rounded-full border border-amber-200/70 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 uppercase">
                    Pending
                  </span>
                )}
                <span className="ml-auto text-[10px] text-stone-400">
                  {fmtDate(review.createdAt)}
                </span>
              </div>
              {review.title && (
                <p className="mt-1 text-xs font-medium text-stone-800">
                  {review.title}
                </p>
              )}
              {review.comment && (
                <p className="mt-0.5 text-[11px] leading-relaxed text-stone-600">
                  {review.comment}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ================================================================== */
/*  Edit base product                                                 */
/* ================================================================== */

function EditProductModal({
  open,
  onClose,
  product,
  categories,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  product: ProductDetailResponse;
  categories: CategoryOption[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState<EditForm>(() => ({
    name: product.product.name,
    briefDescription: product.product.briefDescription,
    description: product.product.description,
    metaTitle: product.product.metaTitle,
    metaDescription: product.product.metaDescription,
    deliveryCharges: String(product.product.deliveryCharges),
    status: product.product.status,
    isFeatured: product.product.isFeatured,
    mainShowcase: product.product.mainShowcase,
    categoryIds: product.categories.map((category) => category.id),
  }));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const setField = <K extends keyof EditForm>(key: K, value: EditForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleCategory = (id: string) =>
    setForm((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(id)
        ? prev.categoryIds.filter((categoryId) => categoryId !== id)
        : [...prev.categoryIds, id],
    }));

  const parentCategories = categories.filter(
    (category) => category.parentId === null,
  );
  const childCategories = categories.filter(
    (category) => category.parentId !== null,
  );

  async function save() {
    if (saving) return;
    setSaving(true);
    setFormError(null);
    try {
      await axios.put(
        `/api/manager/product-studio/${product.product.id}`,
        {
          name: form.name,
          briefDescription: form.briefDescription,
          description: form.description,
          metaTitle: form.metaTitle,
          metaDescription: form.metaDescription,
          deliveryCharges: Number(form.deliveryCharges || 0),
          isFeatured: form.isFeatured,
          mainShowcase: form.mainShowcase,
          status: form.status,
          categoryIds: form.categoryIds,
        },
        { withCredentials: true },
      );
      toast.success("Product updated");
      onSaved();
    } catch (err) {
      setFormError(getAxiosErrorMessage(err, "Could not update the product"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <StudioModal
      open={open}
      onClose={onClose}
      title="Edit base product"
      subtitle="Code and slug stay stable — variants and links depend on them."
      wide
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full border border-stone-200 bg-white px-4 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !form.name.trim()}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-rose-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm shadow-rose-500/25 transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Save changes
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Name" required>
          <TextInput
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="Crochet Bouquet"
          />
        </Field>

        <Field label="Short description">
          <Textarea
            value={form.briefDescription}
            onChange={(e) => setField("briefDescription", e.target.value)}
            rows={2}
            maxLength={500}
            className="min-h-16"
          />
        </Field>

        <Field label="Description">
          <Textarea
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            rows={5}
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Delivery charges (₹)">
            <TextInput
              type="number"
              min={0}
              value={form.deliveryCharges}
              onChange={(e) => setField("deliveryCharges", e.target.value)}
            />
          </Field>

          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) =>
                setField("status", e.target.value as "active" | "inactive")
              }
              className="w-full cursor-pointer rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 transition-colors focus:border-rose-300 focus:ring-2 focus:ring-rose-100 focus:outline-none"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(e) => setField("isFeatured", e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer accent-rose-500"
            />
            Featured on the landing page
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700">
            <input
              type="checkbox"
              checked={form.mainShowcase}
              onChange={(e) => setField("mainShowcase", e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer accent-rose-500"
            />
            Main showcase for its category
          </label>
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold tracking-wider text-stone-700 uppercase">
            Categories
          </p>
          {categories.length === 0 ? (
            <p className="text-[11px] text-stone-400">
              Categories could not be loaded — the current set is kept.
            </p>
          ) : (
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-stone-200 bg-white p-2">
              {[...parentCategories, ...childCategories].map((category) => (
                <label
                  key={category.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-xs hover:bg-rose-50/60 ${
                    category.parentId ? "pl-5 text-stone-600" : "font-medium text-stone-800"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.categoryIds.includes(category.id)}
                    onChange={() => toggleCategory(category.id)}
                    className="h-3.5 w-3.5 cursor-pointer accent-rose-500"
                  />
                  {category.parentId ? "↳ " : ""}
                  {category.name}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Meta title">
            <TextInput
              value={form.metaTitle}
              onChange={(e) => setField("metaTitle", e.target.value)}
              maxLength={255}
            />
          </Field>
          <Field label="Meta description">
            <TextInput
              value={form.metaDescription}
              onChange={(e) => setField("metaDescription", e.target.value)}
              maxLength={500}
            />
          </Field>
        </div>

        {formError && (
          <p className="flex items-start gap-1.5 text-xs text-rose-600">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {formError}
          </p>
        )}
      </div>
    </StudioModal>
  );
}

/* ================================================================== */
/*  Generate variants                                                 */
/* ================================================================== */

function GenerateVariantsModal({
  open,
  onClose,
  product,
  comboCount,
  onGenerated,
}: {
  open: boolean;
  onClose: () => void;
  product: ProductDetailResponse;
  comboCount: number;
  onGenerated: () => void;
}) {
  const [startingPrice, setStartingPrice] = useState(
    String(suggestPrice()),
  );
  const [stock, setStock] = useState("0");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const hasVariants = product.variants.length > 0;

  async function generate() {
    if (saving) return;
    setSaving(true);
    setFormError(null);
    try {
      const res = await axios.post<{ message: string }>(
        `/api/manager/product-studio/${product.product.id}/variants`,
        {
          mode: "all",
          startingPrice: Number(startingPrice || 0),
          stock: Number(stock || 0),
        },
        { withCredentials: true },
      );
      toast.success(res.data.message ?? "Variants generated");
      onGenerated();
    } catch (err) {
      setFormError(getAxiosErrorMessage(err, "Could not generate variants"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <StudioModal
      open={open}
      onClose={onClose}
      title="Generate variants"
      subtitle="One variant per combination of this product's option values."
      footer={
        hasVariants ? (
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full border border-stone-200 bg-white px-4 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-50"
          >
            Close
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-full border border-stone-200 bg-white px-4 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void generate()}
              disabled={saving || comboCount === 0}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-rose-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm shadow-rose-500/25 transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Generate {comboCount} variant{comboCount === 1 ? "" : "s"}
            </button>
          </>
        )
      }
    >
      {hasVariants ? (
        <div className="space-y-3">
          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200/70 bg-amber-50 px-3.5 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-amber-900">
                {product.variants.length} variant
                {product.variants.length === 1 ? "" : "s"} already exist
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-amber-800">
                How do you want to generate? Both paths are disabled for now.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="rounded-2xl border border-stone-200 bg-white px-3.5 py-3">
              <p className="text-xs font-semibold text-stone-800">
                Generate missing variants
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500">
                Only builds combinations that do not exist yet, leaving current
                prices and stock untouched.
              </p>
              <button
                type="button"
                disabled
                className="mt-2 inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-[11px] font-semibold text-stone-400"
              >
                Coming soon
              </button>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white px-3.5 py-3">
              <p className="text-xs font-semibold text-stone-800">
                Regenerate all variants
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500">
                Rebuilds every combination from scratch.
              </p>
              <button
                type="button"
                disabled
                className="mt-2 inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-[11px] font-semibold text-stone-400"
              >
                Coming soon
              </button>
            </div>
          </div>

          <p className="rounded-xl border border-dashed border-amber-200 bg-amber-50/70 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
            <strong>TODO:</strong> before regenerating, check for acting orders
            (any order that is not delivered or cancelled) that use these
            variants and refuse the operation. Then archive the old variants
            instead of deleting them — <code className="font-mono">order_items</code>{" "}
            references them. Missing-variant generation also needs the existing
            combination signatures. See the TODO block in the variants API.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl border border-stone-200 bg-white px-3.5 py-3">
            <p className="text-[10px] font-semibold tracking-wider text-stone-500 uppercase">
              Combinations
            </p>
            {product.options.length === 0 ? (
              <p className="mt-1 text-xs text-rose-600">
                This product has no options yet — add options and values to it
                before generating variants.
              </p>
            ) : (
              <>
                <div className="mt-1.5 space-y-1">
                  {product.options.map((option) => (
                    <p key={option.id} className="text-[11px] text-stone-600">
                      <span className="font-semibold text-stone-800">
                        {option.name}
                      </span>
                      {" · "}
                      {option.values.map((value) => value.value).join(", ") ||
                        "no values"}
                    </p>
                  ))}
                </div>
                <p className="mt-2 text-xs font-semibold text-stone-900">
                  {comboCount} variant{comboCount === 1 ? "" : "s"} will be
                  created
                </p>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Starting price (₹)"
              action={
                <PricingQuizButton
                  onUse={(price) => setStartingPrice(String(price))}
                />
              }
            >
              <TextInput
                type="number"
                min={0}
                value={startingPrice}
                onChange={(e) => setStartingPrice(e.target.value)}
              />
            </Field>

            <Field label="Stock per variant">
              <TextInput
                type="number"
                min={0}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </Field>
          </div>

          <p className="text-[11px] leading-relaxed text-stone-500">
            SKUs are built from <code className="font-mono">{product.product.code}</code>{" "}
            plus the option values, and are guaranteed unique.
          </p>

          {formError && (
            <p className="flex items-start gap-1.5 text-xs text-rose-600">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {formError}
            </p>
          )}
        </div>
      )}
    </StudioModal>
  );
}
