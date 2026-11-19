/* eslint-disable @next/next/no-img-element -- ImageKit already serves sized images */
"use client";

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
import type { ProductListResponse } from "../../../../utils/zod/product/manager.productDetail.zod";

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
  const [data, setData] = useState<ProductListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"" | "active" | "inactive">("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);

  const [categories, setCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchInput.trim()), 300);
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
      const res = await axios.get<ProductListResponse>(LIST_URL, {
        params: {
          q: query || undefined,
          status: status || undefined,
          categoryId: categoryId || undefined,
          page,
          limit: PAGE_LIMIT,
        },
        withCredentials: true,
      });
      setData(res.data);
    } catch (err) {
      setError(getAxiosErrorMessage(err, "Failed to load products"));
    } finally {
      setLoading(false);
    }
  }, [query, status, categoryId, page]);

  useEffect(() => {
    const ahem = () => {
      void load();
    };
    ahem();
  }, [load]);

  const hasFilters = Boolean(query || status || categoryId);

  const resetFilters = () => {
    setSearchInput("");
    setQuery("");
    setStatus("");
    setCategoryId("");
    setPage(1);
  };

  const parentCategories = useMemo(
    () => categories.filter((category) => category.parentId === null),
    [categories],
  );

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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <SectionEyebrow>Product Studio</SectionEyebrow>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
                  All products
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
                  Every base product in the catalogue. Open one to edit it,
                  manage its media, generate variants and read its reviews.
                </p>
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
          </div>
        </section>

        <SectionDivider className="mx-auto max-w-7xl px-4 sm:px-6" />

        {/* Body */}
        <section className="relative">
          <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16">
            {loading && !data && (
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

            {data && !error && (
              <div className="space-y-5">
                {/* Counts */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <CountCard
                    label="Products"
                    value={data.counts.total}
                    hint="In the catalogue"
                    icon={<Package className="h-3.5 w-3.5" />}
                  />
                  <CountCard
                    label="Active"
                    value={data.counts.active}
                    hint="Visible on the site"
                    icon={<Boxes className="h-3.5 w-3.5" />}
                  />
                  <CountCard
                    label="Inactive"
                    value={data.counts.inactive}
                    hint="Hidden from the site"
                    icon={<Boxes className="h-3.5 w-3.5" />}
                  />
                  <CountCard
                    label="No variants"
                    value={data.counts.withoutVariants}
                    hint="Still need generating"
                    icon={<Layers className="h-3.5 w-3.5" />}
                  />
                </div>

                {/* Filters */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="pointer-events-none absolute top-1/2 left-3.5 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
                    <input
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Search name, code or slug…"
                      className={`${inputClass()} py-2 pl-9 text-xs`}
                    />
                  </div>

                  <select
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value as "" | "active" | "inactive");
                      setPage(1);
                    }}
                    className="cursor-pointer rounded-xl border border-stone-200 bg-white px-2.5 py-2 text-xs text-stone-700 transition-colors focus:border-rose-300 focus:ring-1 focus:ring-rose-300 focus:outline-none"
                  >
                    <option value="">All statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>

                  <select
                    value={categoryId}
                    onChange={(e) => {
                      setCategoryId(e.target.value);
                      setPage(1);
                    }}
                    className="cursor-pointer rounded-xl border border-stone-200 bg-white px-2.5 py-2 text-xs text-stone-700 transition-colors focus:border-rose-300 focus:ring-1 focus:ring-rose-300 focus:outline-none"
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
                      className="inline-flex cursor-pointer items-center gap-1 self-start rounded-full border border-rose-200/70 bg-rose-50/60 px-3 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-100 sm:self-auto"
                    >
                      <X className="h-3 w-3" />
                      Clear
                    </button>
                  )}
                </div>

                {/* List */}
                {data.products.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-rose-200/70 bg-white/70 py-12 text-center backdrop-blur-sm sm:rounded-3xl">
                    <Package className="h-5 w-5 text-rose-400" />
                    <p className="text-sm font-semibold text-stone-800">
                      {hasFilters
                        ? "No products match your filters"
                        : "No products yet"}
                    </p>
                    <p className="text-xs text-stone-500">
                      {hasFilters
                        ? "Try a different search or clear the filters."
                        : "Start with a base product — variants come later."}
                    </p>
                    {!hasFilters && (
                      <Link
                        href="/manager/product-studio/products/new"
                        className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-600"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add a product
                      </Link>
                    )}
                  </div>
                ) : (
                  <ul className="space-y-2.5">
                    {data.products.map((product) => (
                      <li key={product.id}>
                        <Link
                          href={`/manager/product-studio/products/${product.id}`}
                          className="group flex items-center gap-3 rounded-2xl border border-white/60 bg-white/85 p-3 backdrop-blur-sm transition-all hover:border-rose-200 hover:bg-white hover:shadow-lg hover:shadow-rose-100/60 sm:gap-4 sm:rounded-3xl sm:p-4"
                        >
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-stone-100 sm:h-14 sm:w-14">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-stone-300">
                                <Package className="h-4 w-4" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="truncate text-sm font-semibold text-stone-900">
                                {product.name}
                              </p>
                              {product.isFeatured && (
                                <span className="rounded-full border border-amber-200/70 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-amber-700 uppercase">
                                  Featured
                                </span>
                              )}
                            </div>
                            <p className="truncate font-mono text-[10px] text-stone-400">
                              {product.code} · /{product.slug}
                            </p>
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
                              {product.minPrice === null
                                ? "—"
                                : product.maxPrice !== null &&
                                    product.maxPrice !== product.minPrice
                                  ? `${formatCurrency(product.minPrice)} – ${formatCurrency(product.maxPrice)}`
                                  : formatCurrency(product.minPrice)}
                            </p>
                            <p className="text-[10px] text-stone-500">price</p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${
                              product.status === "active"
                                ? "border-emerald-200/70 bg-emerald-50 text-emerald-700"
                                : "border-stone-200/70 bg-stone-50 text-stone-600"
                            }`}
                          >
                            {product.status}
                          </span>

                          <ChevronRight className="h-4 w-4 shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-rose-500" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Pagination */}
                {data.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1 || loading}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-rose-200/70 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Prev
                    </button>
                    <span className="text-xs text-stone-500">
                      Page {data.pagination.page} of {data.pagination.totalPages}
                      {" · "}
                      {data.pagination.total} product
                      {data.pagination.total === 1 ? "" : "s"}
                    </span>
                    <button
                      onClick={() =>
                        setPage((p) =>
                          Math.min(data.pagination.totalPages, p + 1),
                        )
                      }
                      disabled={page >= data.pagination.totalPages || loading}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-rose-200/70 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </PageWrapper>
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
