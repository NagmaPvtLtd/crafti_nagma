"use client";

import Image from "next/image";

import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Layers,
  Package,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import getAxiosErrorMessage from "../../../../utils/Auth/Auth.axiosErrorHelper.util";
import PageWrapper from "../../utils/PageWrapper";
import { SectionDivider, SectionEyebrow } from "../../utils/SectionDiv";
import { inputClass } from "../../utils/Form/fieldStyles";
import CustomLoader from "../../CustomLoader";
import type {
  ProductListItem,
  ProductListResponse,
} from "../../../../utils/zod/product/manager.productDetail.zod";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

import { formatCurrency } from "../../../../utils/Formator/formatCurrency.util";

const LIST_URL = "/api/manager/product-studio/products";
const CATEGORIES_URL = "/api/manager/product-studio/categories";
const PAGE_LIMIT = 20;

type CategoryOption = {
  id: string;
  name: string;
  parentId: string | null;
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ProductListClient() {
  const [activeData, setActiveData] = useState<ProductListResponse | null>(
    null,
  );
  const [disabledData, setDisabledData] = useState<ProductListResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [activePage, setActivePage] = useState(1);
  const [disabledPage, setDisabledPage] = useState(1);

  const [categories, setCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(searchInput.trim());
      setActivePage(1);
      setDisabledPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let active = true;

    axios
      .get<{ categories: CategoryOption[] }>(CATEGORIES_URL, {
        withCredentials: true,
      })
      .then((res) => {
        if (active) setCategories(res.data.categories ?? []);
      })
      .catch(() => {
        /* the filter is optional — the list still works without it */
      });

    return () => {
      active = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const common = {
        q: query || undefined,
        categoryId: categoryId || undefined,
        limit: PAGE_LIMIT,
      };

      const [activeRes, disabledRes] = await Promise.all([
        axios.get<ProductListResponse>(LIST_URL, {
          params: { ...common, status: "active", page: activePage },
          withCredentials: true,
        }),
        axios.get<ProductListResponse>(LIST_URL, {
          params: { ...common, status: "inactive", page: disabledPage },
          withCredentials: true,
        }),
      ]);

      setActiveData(activeRes.data);
      setDisabledData(disabledRes.data);
    } catch (err) {
      setError(getAxiosErrorMessage(err, "Failed to load products"));
    } finally {
      setLoading(false);
    }
  }, [query, categoryId, activePage, disabledPage]);

  useEffect(() => {
    const ahem = () => {
      void load();
    };
    ahem();
  }, [load]);

  const hasFilters = Boolean(query || categoryId);

  const resetFilters = () => {
    setSearchInput("");
    setQuery("");
    setCategoryId("");
    setActivePage(1);
    setDisabledPage(1);
  };

  const parentCategories = useMemo(
    () => categories.filter((category) => category.parentId === null),
    [categories],
  );

  const counts = activeData?.counts ?? disabledData?.counts ?? null;

  return (
    <PageWrapper variant="content" position="fixed">
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-12 sm:px-6 sm:pt-10 sm:pb-16">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <SectionEyebrow href="/manager/product-studio">
              PRODUCT STUDIO
            </SectionEyebrow>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
              All products
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/manager/product-studio/products/new"
              className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-rose-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-rose-500/25 transition-colors hover:bg-rose-600"
            >
              <Plus className="h-3.5 w-3.5" />
              Add product
            </Link>
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
          </div>
        </div>

        <SectionDivider className="my-6" size={11} />

        {loading && !activeData && !disabledData && (
          <CustomLoader fullScreen={false} label="Loading products…" />
        )}

        {error && !loading && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200/70 bg-rose-50 px-4 py-3.5 sm:rounded-3xl sm:px-5 sm:py-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-rose-800">
                Couldn&apos;t load the products
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

        {counts && !error && (
          <div className="space-y-5">
            {/* Counts */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <CountCard
                label="Products"
                value={counts.total}
                hint="In the catalogue"
                icon={<Package className="h-3.5 w-3.5" />}
              />
              <CountCard
                label="Active"
                value={counts.active}
                hint="Visible on the site"
                icon={<Boxes className="h-3.5 w-3.5" />}
              />
              <CountCard
                label="Inactive"
                value={counts.inactive}
                hint="Hidden from the site"
                icon={<Boxes className="h-3.5 w-3.5" />}
              />
              <CountCard
                label="No variants"
                value={counts.withoutVariants}
                hint="Still need generating"
                icon={<Layers className="h-3.5 w-3.5" />}
              />
            </div>

            {/* Filters — one full-width row on mobile, search-first on desktop.
                Every control is h-10 so the three sit on the same baseline. */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative w-full sm:min-w-0 sm:flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search name, code or slug…"
                  className={`${inputClass()} h-10 w-full pl-9 text-xs`}
                />
              </div>

              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setActivePage(1);
                  setDisabledPage(1);
                }}
                className="h-10 w-full cursor-pointer rounded-xl border border-stone-200 bg-white px-3 text-xs text-stone-700 transition-colors focus:border-rose-300 focus:ring-1 focus:ring-rose-300 focus:outline-none sm:w-auto sm:min-w-44"
              >
                <option value="">All categories</option>
                {parentCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              {hasFilters && (
                <button
                  onClick={resetFilters}
                  className="inline-flex h-10 w-full shrink-0 cursor-pointer items-center justify-center gap-1 rounded-xl border border-rose-200/70 bg-rose-50/60 px-3 text-xs font-semibold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-100 sm:w-auto"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              )}
            </div>

            {/* Sections */}
            <ProductSection
              title="Active products"
              hint="Visible in the collections and on the home page."
              tone="active"
              data={activeData}
              loading={loading}
              emptyLabel={
                hasFilters
                  ? "No active products match your filters."
                  : "No active products yet."
              }
              onPage={setActivePage}
            />

            <ProductSection
              title="Disabled products"
              hint="Hidden from the storefront. Their variants are disabled too."
              tone="disabled"
              data={disabledData}
              loading={loading}
              emptyLabel={
                hasFilters
                  ? "No disabled products match your filters."
                  : "No disabled products."
              }
              onPage={setDisabledPage}
            />
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

/* ------------------------------------------------------------------ */
/*  Section + row                                                      */
/* ------------------------------------------------------------------ */

function ProductSection({
  title,
  hint,
  tone,
  data,
  loading,
  emptyLabel,
  onPage,
}: {
  title: string;
  hint: string;
  tone: "active" | "disabled";
  data: ProductListResponse | null;
  loading: boolean;
  emptyLabel: string;
  onPage: (next: number) => void;
}) {
  const page = data?.pagination.page ?? 1;
  const totalPages = data?.pagination.totalPages ?? 1;

  return (
    <section className="rounded-2xl border border-white/60 bg-white/85 p-4 backdrop-blur-sm sm:rounded-3xl sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-stone-900">
            <span
              className={`h-2 w-2 rounded-full ${
                tone === "active" ? "bg-emerald-500" : "bg-stone-400"
              }`}
            />
            {title}
            <span className="text-xs font-normal text-stone-400">
              ({data?.pagination.total ?? 0})
            </span>
          </h2>
          <p className="mt-0.5 text-[11px] text-stone-500">{hint}</p>
        </div>
      </div>

      {!data || data.products.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-stone-200 px-4 py-7 text-center text-xs text-stone-400">
          {emptyLabel}
        </p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {data.products.map((product) => (
            <ProductRow key={product.id} product={product} />
          ))}
        </ul>
      )}

      {data && totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            onClick={() => onPage(Math.max(1, page - 1))}
            disabled={page <= 1 || loading}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-rose-200/70 bg-white/70 px-3 py-1 text-[11px] font-semibold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-3 w-3" />
            Prev
          </button>
          <span className="text-[11px] text-stone-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages || loading}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-rose-200/70 bg-white/70 px-3 py-1 text-[11px] font-semibold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </section>
  );
}

function ProductRow({ product }: { product: ProductListItem }) {
  const priceLabel =
    product.minPrice === null
      ? "—"
      : product.maxPrice !== null && product.maxPrice !== product.minPrice
        ? `${formatCurrency(product.minPrice)} – ${formatCurrency(product.maxPrice)}`
        : formatCurrency(product.minPrice);

  const statusClass =
    product.status === "active"
      ? "border-emerald-200/70 bg-emerald-50 text-emerald-700"
      : "border-stone-200/70 bg-stone-50 text-stone-600";

  return (
    <li>
      <Link
        href={`/manager/product-studio/products/${product.code || product.id}`}
        className="group flex items-start gap-3 rounded-2xl border border-white/60 bg-white/85 p-3 backdrop-blur-sm transition-all hover:border-rose-200 hover:bg-white hover:shadow-lg hover:shadow-rose-100/60 sm:items-center sm:gap-4 sm:rounded-3xl sm:p-4"
      >
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-stone-100 sm:h-14 sm:w-14">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="56px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-stone-300">
              <Package className="h-4 w-4" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-semibold wrap-break-word text-stone-900">
              {product.name}
            </p>
            {product.isFeatured && (
              <span className="rounded-full border border-amber-200/70 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-amber-700 uppercase">
                Featured
              </span>
            )}
          </div>
          <p className="mt-1 text-[10px] break-all text-stone-400">
            Code: <span className="font-mono">{product.code}</span>
          </p>

          {/* Mobile: the row's facts stacked inside the card, so a long name
              wraps instead of being cut off. */}
          <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-stone-100 pt-2.5 sm:hidden">
            <MobileStat label="Variants" value={`${product.variantCount}`} />
            <MobileStat label="In stock" value={`${product.totalStock}`} />
            <MobileStat label="Price" value={priceLabel} />
            <MobileStat label="Status" value={product.status} capitalize />
          </div>
        </div>

        <div className="hidden shrink-0 text-right sm:block">
          <p className="text-xs font-semibold tabular-nums text-stone-900">
            {product.variantCount} variant
            {product.variantCount === 1 ? "" : "s"}
          </p>
          <p className="text-[10px] text-stone-500">
            {product.totalStock} in stock
          </p>
        </div>

        <div className="hidden shrink-0 text-right md:block">
          <p className="text-xs font-semibold tabular-nums text-stone-900">
            {priceLabel}
          </p>
          <p className="text-[10px] text-stone-500">price</p>
        </div>

        <span
          className={`hidden shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize sm:inline-flex ${statusClass}`}
        >
          {product.status}
        </span>

        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-rose-500 sm:mt-0" />
      </Link>
    </li>
  );
}

/** One label/value pair in the mobile card. Long values wrap, never truncate. */
function MobileStat({
  label,
  value,
  capitalize = false,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-semibold tracking-wider text-stone-400 uppercase">
        {label}
      </p>
      <p
        className={`text-[11px] leading-tight font-semibold wrap-break-word text-stone-900 tabular-nums ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Count card                                                         */
/* ------------------------------------------------------------------ */

function CountCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: number;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/85 px-3 py-3 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:bg-white hover:shadow-lg hover:shadow-rose-100/60 sm:rounded-3xl sm:px-4 sm:py-3.5">
      <div className="flex items-center gap-1.5">
        <span className="text-stone-900">{icon}</span>
        <p className="truncate text-[10px] font-semibold tracking-wider text-rose-500/80 uppercase">
          {label}
        </p>
      </div>
      <p className="mt-1.5 truncate text-base font-semibold tabular-nums text-stone-900 sm:text-lg">
        {value.toLocaleString("en-IN")}
      </p>
      <p className="mt-0.5 truncate text-[10px] text-stone-400">{hint}</p>
    </div>
  );
}
