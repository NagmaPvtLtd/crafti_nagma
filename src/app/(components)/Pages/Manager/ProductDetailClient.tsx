"use client";

import Image from "next/image";

import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  AlertCircle,
  Boxes,
  Check,
  CheckCircle2,
  ChevronRight,
  FolderTree,
  IndianRupee,
  Layers,
  Loader2,
  Package,
  Pencil,
  RefreshCw,
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
import StudioModal from "./StudioModal";
import PricingQuizButton from "./PricingQuizModal";
import { suggestPrice } from "../../../../utils/Pricing/pricing.util";
import { formatCurrency } from "../../../../utils/Formator/formatCurrency.util";
import { formatDateTime } from "../../../../utils/Formator/formatDateTime.util";
import type {
  ProductDetailResponse,
  ProductVariantSummary,
} from "../../../../utils/zod/product/manager.productDetail.zod";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ProductDetailClient({
  productId,
}: {
  productId: string;
}) {
  const [data, setData] = useState<ProductDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [generateOpen, setGenerateOpen] = useState(false);

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

  const comboCount = useMemo(() => {
    if (!data || data.options.length === 0) return 0;
    return data.options.reduce(
      (total, option) => total * Math.max(option.values.length, 1),
      1,
    );
  }, [data]);

  return (
    <PageWrapper variant="content" position="fixed">
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-12 sm:px-6 sm:pt-10 sm:pb-16">
        {data ? (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <SectionEyebrow href="/manager/product-studio/products">
                Product overview
              </SectionEyebrow>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
                  {data.product.name}
                </h1>
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
              <Link
                href={`/manager/product-studio/products/${data.product.code || data.product.id}/edit`}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-50"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit product
              </Link>
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
          <div className="mt-2 h-9 w-64 animate-pulse rounded-full bg-stone-200/70" />
        )}

        <SectionDivider className="my-6" size={11} />

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

            <BaseDetails data={data} />

            <VariantsSection
              variants={data.variants}
              productRef={data.product.code || data.product.id}
              onGenerate={() => setGenerateOpen(true)}
            />

            <ReviewsSection
              reviews={data.reviews}
              averageRating={data.stats.averageRating}
              reviewCount={data.stats.reviewCount}
            />
          </div>
        )}

        {data && (
          <>
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
        ? `${formatCurrency(stats.minPrice)} – ${formatCurrency(stats.maxPrice)}`
        : formatCurrency(stats.minPrice);

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
      value: formatCurrency(stats.revenue),
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
            <p className="text-[10px] font-semibold tracking-wider wrap-break-word text-rose-500/80 uppercase">
              {item.label}
            </p>
          </div>
          <p className="mt-1.5 text-sm font-semibold wrap-break-word tabular-nums text-stone-900 sm:text-base">
            {item.value}
          </p>
          <p className="mt-0.5 text-[10px] wrap-break-word text-stone-400">
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

  /* Group the assigned categories so sub categories hang under their parent
     instead of sitting in one flat run of chips. A sub category that is
     assigned without its parent still gets rendered on its own. */
  const assignedIds = new Set(data.categories.map((category) => category.id));
  const rootCategories = data.categories.filter(
    (category) => category.parentId === null,
  );
  const orphans = data.categories.filter(
    (category) =>
      category.parentId !== null && !assignedIds.has(category.parentId),
  );
  const childrenOf = (parentId: string) =>
    data.categories.filter((category) => category.parentId === parentId);

  return (
    <div className="h-full rounded-2xl border border-white/60 bg-white/85 p-4 backdrop-blur-sm sm:rounded-3xl sm:p-5">
      <SectionEyebrow>Base product</SectionEyebrow>
      <h2 className="mt-1 text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
        About this item
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
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[10px] font-semibold tracking-wider text-stone-500 uppercase">
            Categories
          </p>
          {data.categories.length > 0 && (
            <span className="text-[10px] font-medium text-stone-400">
              {data.categories.length} assigned
            </span>
          )}
        </div>

        {data.categories.length === 0 ? (
          <p className="mt-1 text-xs text-stone-400">No categories assigned.</p>
        ) : (
          <div className="mt-1.5 space-y-1.5">
            {rootCategories.map((root) => {
              const children = childrenOf(root.id);

              return (
                <div
                  key={root.id}
                  className="overflow-hidden rounded-xl border border-stone-200 bg-white"
                >
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5">
                    <FolderTree className="h-3 w-3 shrink-0 text-rose-400" />
                    <span className="min-w-0 flex-1 text-[11.5px] font-semibold wrap-break-word text-stone-800">
                      {root.name}
                    </span>
                    {children.length > 0 && (
                      <span className="shrink-0 text-[10px] font-medium text-stone-400">
                        {children.length}
                      </span>
                    )}
                    <span className="shrink-0 rounded-full bg-stone-100 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-stone-500 uppercase">
                      Main
                    </span>
                  </div>

                  {children.length > 0 && (
                    <div className="border-t border-dashed border-stone-200 bg-stone-50/50 py-1 pr-2.5">
                      {children.map((sub) => (
                        <div
                          key={sub.id}
                          className="relative flex items-center pl-6"
                        >
                          <span
                            aria-hidden
                            className="pointer-events-none absolute top-0 bottom-0 left-3 border-l border-dashed border-stone-300"
                          />
                          <span
                            aria-hidden
                            className="pointer-events-none absolute top-1/2 left-3 w-2 border-b border-dashed border-stone-300"
                          />
                          <span className="min-w-0 flex-1 py-0.5 text-[11px] wrap-break-word text-stone-600">
                            {sub.name}
                          </span>
                          <span className="ml-2 shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-stone-400 uppercase ring-1 ring-stone-200">
                            Sub
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {orphans.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-dashed border-stone-200 bg-white">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5">
                  <FolderTree className="h-3 w-3 shrink-0 text-stone-300" />
                  <span className="min-w-0 flex-1 text-[11px] font-medium wrap-break-word text-stone-500">
                    Sub categories without their main
                  </span>
                </div>
                <div className="border-t border-dashed border-stone-200 py-1 pr-2.5">
                  {orphans.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-1.5 pl-6"
                    >
                      <span className="min-w-0 flex-1 py-0.5 text-[11px] wrap-break-word text-stone-600">
                        {sub.name}
                      </span>
                      <span className="ml-2 shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-stone-400 uppercase ring-1 ring-stone-200">
                        Sub
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
              <div
                key={option.id}
                className="flex flex-wrap items-center gap-1.5"
              >
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

      <div className="mt-4">
        <p className="text-[10px] font-semibold tracking-wider text-stone-500 uppercase">
          Product Tags
        </p>
        {data.tags.length === 0 ? (
          <p className="mt-1 text-xs text-stone-400">No tags added.</p>
        ) : (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {data.tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full border border-rose-200/70 bg-rose-50/60 px-2 py-0.5 text-[10px] font-medium text-rose-600"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {(data.features.length > 0 || data.careInstructions.length > 0) && (
        <div className="mt-5 grid grid-cols-1 gap-5 border-t border-stone-100 pt-4 lg:grid-cols-2">
          {data.features.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
                Features
              </h3>
              <ul className="mt-2 space-y-1.5">
                {data.features.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-2 text-xs leading-snug text-stone-600"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    {item.value}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.careInstructions.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
                Care Instructions
              </h3>
              <ul className="mt-2 space-y-1.5">
                {data.careInstructions.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-2 text-xs leading-snug text-stone-600"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    {item.value}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-5 border-t border-stone-100 pt-4">
        <h3 className="text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
          Product Specifications
        </h3>
      </div>

      <div className="mt-2.5 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        <dl className="space-y-2 text-xs">
          <DetailRow
            label="Delivery"
            value={formatCurrency(product.deliveryCharges)}
          />
          <DetailRow label="Processing" value={product.processingTime || "—"} />
          <DetailRow
            label="Dimensions"
            value={formatDimensions(product.dimensions)}
          />
        </dl>

        <dl className="space-y-2 text-xs">
          <DetailRow label="Status" value={product.status} capitalize />
          <DetailRow
            label="Featured"
            value={product.isFeatured ? "Yes" : "No"}
          />
          <DetailRow
            label="Showcase"
            value={product.mainShowcase ? "Yes" : "No"}
          />
          <DetailRow
            label="Created"
            value={formatDateTime(product.createdAt, { format: "date-long" })}
          />
          <DetailRow
            label="Updated"
            value={formatDateTime(product.updatedAt, { format: "date-long" })}
          />
        </dl>
      </div>

      {(product.metaTitle || product.metaDescription) && (
        <div className="mt-5 border-t border-stone-100 pt-4">
          <h3 className="text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
            SEO
          </h3>
          {product.metaTitle && (
            <p className="mt-2 text-sm font-medium text-stone-800">
              {product.metaTitle}
            </p>
          )}
          {product.metaDescription && (
            <p className="mt-1 text-xs leading-relaxed text-stone-500">
              {product.metaDescription}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function formatDimensions(dimensions: {
  length: number | null;
  width: number | null;
  height: number | null;
  dimensionUnit: "cm" | "in" | null;
}): string {
  const parts: string[] = [];
  if (dimensions.length !== null) parts.push(`L ${dimensions.length}`);
  if (dimensions.width !== null) parts.push(`W ${dimensions.width}`);
  if (dimensions.height !== null) parts.push(`H ${dimensions.height}`);
  if (parts.length === 0) return "—";
  return `${parts.join(" × ")} ${dimensions.dimensionUnit ?? ""}`.trim();
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
      <dt className="shrink-0 text-[10px] font-semibold tracking-wider text-stone-400 uppercase">
        {label}
      </dt>
      <dd
        className={`min-w-0 text-right text-[11px] font-medium wrap-break-word text-stone-700 ${
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
  productRef,
  onGenerate,
}: {
  variants: ProductVariantSummary[];
  /** Product code — variant pages live under the code, not the raw id. */
  productRef: string;
  onGenerate: () => void;
}) {
  const active = variants.filter((variant) => variant.status === "active");
  const disabled = variants.filter((variant) => variant.status !== "active");

  return (
    <section className="rounded-2xl border border-white/60 bg-white/85 p-4 backdrop-blur-sm sm:rounded-3xl sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <SectionEyebrow>Purchasable</SectionEyebrow>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
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
        <div className="mt-3 space-y-4">
          <VariantGroup
            title="Active variants"
            hint="Live on the storefront."
            tone="active"
            variants={active}
            productRef={productRef}
            empty="No active variants yet — complete one and activate it."
          />
          <VariantGroup
            title="Disabled variants"
            hint="Hidden from the storefront."
            tone="disabled"
            variants={disabled}
            productRef={productRef}
            empty="No disabled variants."
          />
        </div>
      )}
    </section>
  );
}

function VariantGroup({
  title,
  hint,
  tone,
  variants,
  productRef,
  empty,
}: {
  title: string;
  hint: string;
  tone: "active" | "disabled";
  variants: ProductVariantSummary[];
  productRef: string;
  empty: string;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-1.5">
        <h3 className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-stone-500 uppercase">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              tone === "active" ? "bg-emerald-500" : "bg-stone-400"
            }`}
          />
          {title}
          <span className="font-normal text-stone-400">
            ({variants.length})
          </span>
        </h3>
        <p className="text-[10px] text-stone-400">{hint}</p>
      </div>

      {variants.length === 0 ? (
        <p className="mt-1.5 rounded-xl border border-dashed border-stone-200 px-3 py-3 text-[11px] leading-relaxed text-stone-400">
          {empty}
        </p>
      ) : (
        <ul className="mt-2 space-y-2.5">
          {variants.map((variant) => (
            <VariantRow
              key={variant.id}
              variant={variant}
              productRef={productRef}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function VariantRow({
  variant,
  productRef,
}: {
  variant: ProductVariantSummary;
  productRef: string;
}) {
  return (
    <li>
      <Link
        href={`/manager/product-studio/products/${productRef}/variants/${variant.sku || variant.id}`}
        className="group flex items-start gap-3 rounded-2xl border border-stone-200/70 bg-white/85 p-3 backdrop-blur-sm transition-all hover:border-rose-200 hover:bg-white hover:shadow-lg hover:shadow-rose-100/60 sm:items-center sm:gap-4"
      >
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-stone-100 sm:h-11 sm:w-11">
          {variant.imageUrl ? (
            <Image
              src={variant.imageUrl}
              alt={variant.name || variant.sku}
              fill
              sizes="40px"
              loading={"eager"}
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-stone-300">
              <Layers className="h-3.5 w-3.5" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold wrap-break-word text-stone-900">
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
            {variant.hideStock && (
              <span
                title="Shown as out of stock on the storefront"
                className="rounded-full border border-amber-200/70 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700"
              >
                Hidden
              </span>
            )}
            <span className="font-mono text-[9px] break-all text-stone-400">
              {variant.sku}
            </span>
          </div>

          {/* Mobile: price, stock and status sit under the name, so a long
              variant name wraps instead of being cut off. */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 sm:hidden">
            <span className="text-[11px] font-semibold tabular-nums text-stone-900">
              {formatCurrency(variant.price)}
            </span>
            <span className="text-[10px] text-stone-500">
              · {variant.stock} in stock
            </span>
            <span
              className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold capitalize ${
                variant.status === "active"
                  ? "border-emerald-200/70 bg-emerald-50 text-emerald-700"
                  : "border-stone-200/70 bg-stone-50 text-stone-600"
              }`}
            >
              {variant.status}
            </span>
          </div>
        </div>

        <div className="hidden shrink-0 text-right sm:block">
          <p className="text-xs font-semibold tabular-nums text-stone-900">
            {formatCurrency(variant.price)}
          </p>
          <p className="text-[10px] text-stone-500">{variant.stock} in stock</p>
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
  );
}

/* ================================================================== */
/*  Reviews                                                           */
/* ================================================================== */

function Stars({ rating }: { rating: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${rating} out of 5`}
    >
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
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
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
          <p className="text-sm font-semibold text-stone-800">No reviews yet</p>
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
                  {formatDateTime(review.createdAt, { format: "date-long" })}
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
/*  Generate variants                                                 */
/* ================================================================== */

type GenerateCombo = {
  key: string;
  label: string;
  valueIds: string[];
};

function buildGenerateCombos(product: ProductDetailResponse): GenerateCombo[] {
  if (product.options.length === 0) return [];

  let combos: { valueIds: string[]; labels: string[] }[] = [
    { valueIds: [], labels: [] },
  ];

  for (const option of product.options) {
    const next: { valueIds: string[]; labels: string[] }[] = [];
    for (const combo of combos) {
      for (const value of option.values) {
        next.push({
          valueIds: [...combo.valueIds, value.id],
          labels: [...combo.labels, value.value],
        });
      }
    }
    combos = next;
  }

  return combos.map((combo) => ({
    key: [...combo.valueIds].sort().join("|"),
    label: combo.labels.join(" / "),
    valueIds: combo.valueIds,
  }));
}

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
  const combos = useMemo(() => buildGenerateCombos(product), [product]);
  /** Combinations already covered by a variant are not ticked by default. */
  const existingKeys = useMemo(
    () =>
      new Set(
        product.variants.map((variant) =>
          [...variant.optionValueIds].sort().join("|"),
        ),
      ),
    [product.variants],
  );
  const [selected, setSelected] = useState<string[]>(() =>
    combos
      .filter((combo) => !existingKeys.has(combo.key))
      .map((combo) => combo.key),
  );
  const [startingPrice, setStartingPrice] = useState(String(suggestPrice()));
  const [stock, setStock] = useState("0");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const allSelected = combos.length > 0 && selected.length === combos.length;

  function toggleCombo(key: string) {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
  }

  function toggleAll() {
    setSelected(allSelected ? [] : combos.map((combo) => combo.key));
  }

  async function generate() {
    if (saving) return;

    const chosen = combos.filter((combo) => selected.includes(combo.key));
    if (chosen.length === 0) {
      setFormError("Tick at least one combination to generate.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const res = await axios.post<{ message: string }>(
        `/api/manager/product-studio/${product.product.id}/variants`,
        {
          mode: "selected",
          combinations: chosen.map((combo) => combo.valueIds),
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
      subtitle="Tick the combinations you want. Any combination that already exists is left as it is."
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
            onClick={() => void generate()}
            disabled={saving || selected.length === 0}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-rose-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm shadow-rose-500/25 transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Generate {selected.length} variant{selected.length === 1 ? "" : "s"}
          </button>
        </>
      }
    >
      {product.options.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-rose-200/70 bg-rose-50/30 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-stone-800">No options yet</p>
          <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
            Add options and values to this product before generating variants.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[11px] leading-relaxed text-amber-800">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              <span className="font-semibold">
                Variants cannot be removed once generated.
              </span>{" "}
              Please select the available variants for this base product
              carefully — a wrong one can only be disabled from its variant
              page. New variants start{" "}
              <span className="font-semibold">inactive</span>: add a name, short
              description, description and at least one photo, then activate
              them.
            </span>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white px-3.5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-semibold tracking-wider text-stone-500 uppercase">
                Combinations
              </p>
              <p className="text-[11px] text-stone-500">
                {selected.length} of {comboCount} selected
              </p>
            </div>

            <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-stone-50/70 px-3 py-2 text-xs font-semibold text-stone-800">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="h-3.5 w-3.5 cursor-pointer accent-rose-500"
              />
              All combinations
            </label>

            <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto pr-1">
              {combos.map((combo) => {
                const checked = selected.includes(combo.key);
                return (
                  <li key={combo.key}>
                    <label
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-colors ${
                        checked
                          ? "border-rose-300 bg-rose-50/60 text-stone-900"
                          : "border-stone-200 bg-white text-stone-600 hover:border-rose-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCombo(combo.key)}
                        className="h-3.5 w-3.5 cursor-pointer accent-rose-500"
                      />
                      <span className="min-w-0 flex-1 font-medium wrap-break-word">
                        {combo.label}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>

            <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
              Combinations that already exist are skipped, so prices, stock and
              orders on current variants stay untouched.
            </p>
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
            Each new variant copies the base product&apos;s short description
            and description. The SKU is built from{" "}
            <code className="font-mono">{product.product.code}</code> plus the
            option values, so every variant gets its own code.
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
