"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import {
  ArrowRight,
  Flower2,
  Layers,
  Search,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";

import CustomLoader from "../CustomLoader";
import PageWrapper from "../utils/PageWrapper";
import { SectionDivider, SectionEyebrow } from "../utils/SectionDiv";
import { inputClass } from "../utils/Form/fieldStyles";
import CollectionCard, { productPriceLabel } from "./CollectionCard";
import type { CollectionsResponse } from "../../../types/Collection.types";

/* -------------------------------------------------------------------------- */
/*  /collections — featured picks, the category tree, then every product link */
/* -------------------------------------------------------------------------- */

export default function Collections() {
  const [data, setData] = useState<CollectionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get<CollectionsResponse>(
          "/api/public/collections",
        );
        if (!cancelled) setData(res.data);
      } catch {
        if (!cancelled) setError("Could not load the collections right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const products = useMemo(() => {
    const list = data?.products ?? [];
    const term = query.trim().toLowerCase();
    if (!term) return list;
    return list.filter((product) => {
      const path = `${product.category?.name ?? ""} ${
        product.subcategory?.name ?? ""
      }`;
      return (
        product.name.toLowerCase().includes(term) ||
        product.code.toLowerCase().includes(term) ||
        path.toLowerCase().includes(term)
      );
    });
  }, [data, query]);

  const featured = data?.featured ?? [];
  const categories = data?.categories ?? [];

  return (
    <PageWrapper variant="hero" position="fixed">
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-12 sm:px-6 sm:pt-10 sm:pb-16">
            <SectionEyebrow>Collections · live catalogue</SectionEyebrow>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
              Everything on the shelf.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-600 sm:text-base">
              Featured pieces first, then browse by category or jump straight
              to a product.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-stone-500">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/80 px-2.5 py-1 backdrop-blur-sm">
                <ShoppingBag className="h-3 w-3 text-rose-400" />
                {data?.totalProducts ?? 0} products
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/80 px-2.5 py-1 backdrop-blur-sm">
                <Layers className="h-3 w-3 text-rose-400" />
                {categories.length} categories
              </span>
              <Link
                href="#products"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/80 px-2.5 py-1 font-semibold text-rose-600 backdrop-blur-sm transition-colors hover:bg-white"
              >
                All product links
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

        <SectionDivider className="my-6" size={11} />

        {loading ? (
          <div className="pb-16">
            <CustomLoader fullScreen={false} label="Loading the catalogue…" />
          </div>
        ) : error ? (
          <div className="pb-16">
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 px-5 py-6 text-sm text-rose-700">
              {error}
            </div>
          </div>
        ) : (
          <>
            {/* ---------------- Featured Products ---------------- */}
            <section className="relative">
              <div className="pb-8 sm:pb-10">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <SectionEyebrow>Featured Products</SectionEyebrow>
                    <h2 className="mt-1 text-lg font-semibold text-stone-900 sm:text-xl">
                      Picked for you
                    </h2>
                  </div>
                  <span className="text-[11px] text-stone-500">
                    {featured.length} featured
                  </span>
                </div>

                {featured.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-rose-200 bg-white/70 px-4 py-6 text-center text-xs text-stone-500">
                    Nothing is marked as featured yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {featured.map((product) => (
                      <CollectionCard key={product.id} product={product} />
                    ))}
                  </div>
                )}
              </div>
            </section>

            <SectionDivider className="my-6" size={11} />

            {/* ---------------- All Categories ---------------- */}
            <section className="relative">
              <div className="pb-8 sm:pb-10">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <SectionEyebrow>All Categories</SectionEyebrow>
                    <h2 className="mt-1 text-lg font-semibold text-stone-900 sm:text-xl">
                      Browse by category
                    </h2>
                  </div>
                  <span className="text-[11px] text-stone-500">
                    {categories.length} categories
                  </span>
                </div>

                {categories.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-rose-200 bg-white/70 px-4 py-6 text-center text-xs text-stone-500">
                    No categories have been created yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        className="rounded-2xl border border-white/60 bg-white/85 p-4 backdrop-blur-sm sm:rounded-3xl"
                      >
                        <Link
                          href={category.href}
                          className="group flex items-center justify-between gap-2"
                        >
                          <h3 className="text-sm font-semibold text-stone-900 group-hover:text-rose-600">
                            {category.name}
                          </h3>
                          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-rose-600">
                            {category.totalProductCount}
                            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                          </span>
                        </Link>

                        {category.subcategories.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {category.subcategories.map((sub) => (
                              <Link
                                key={sub.id}
                                href={sub.href}
                                className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-600 transition-colors hover:border-rose-200 hover:text-rose-600"
                              >
                                {sub.name}
                                <span className="ml-1 text-[10px] text-stone-400">
                                  {sub.productCount}
                                </span>
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-[11px] text-stone-400">
                            No subcategories
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <SectionDivider className="my-6" size={11} />

            {/* ---------------- Product links ---------------- */}
            <section className="relative" id="products">
              <div className="pb-12 sm:pb-16">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <SectionEyebrow>All Products</SectionEyebrow>
                    <h2 className="mt-1 text-lg font-semibold text-stone-900 sm:text-xl">
                      Every product link
                    </h2>
                  </div>

                  <div className="relative w-full sm:w-72">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search products"
                      aria-label="Search products"
                      className={`${inputClass(false)} rounded-full py-2 pl-9 pr-8 text-xs`}
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        aria-label="Clear search"
                        className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer rounded-full p-0.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {products.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-rose-200 bg-white/70 px-6 py-12 text-center backdrop-blur-sm">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-500">
                      <Flower2 className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-stone-900">
                      {query ? "No products match that search" : "No products yet"}
                    </h3>
                    <p className="mt-1 max-w-sm text-xs text-stone-600">
                      {query
                        ? "Try another name, code or category."
                        : "Products added in the studio will appear here."}
                    </p>
                    {query && (
                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        className="mt-4 cursor-pointer rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-stone-800"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                ) : (
                  <ul className="overflow-hidden rounded-2xl border border-white/60 bg-white/85 backdrop-blur-sm sm:rounded-3xl">
                    {products.map((product) => (
                      <li
                        key={product.id}
                        className="border-b border-stone-100 last:border-b-0"
                      >
                        <Link
                          href={product.href}
                          className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-rose-50/40"
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-stone-100 bg-rose-50">
                            {product.imageUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Flower2 className="h-4 w-4 text-rose-300" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-stone-900 group-hover:text-rose-600">
                              {product.name}
                            </p>
                            <p className="truncate text-[11px] text-stone-500">
                              {product.category
                                ? `${product.category.name}${
                                    product.subcategory
                                      ? ` · ${product.subcategory.name}`
                                      : ""
                                  }`
                                : "Uncategorised"}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold tabular-nums text-stone-900">
                              {productPriceLabel(product)}
                            </p>
                            {product.totalStock <= 0 && (
                              <p className="text-[10px] font-semibold text-stone-400 uppercase">
                                Sold out
                              </p>
                            )}
                          </div>

                          <ArrowRight className="h-4 w-4 shrink-0 text-stone-300 transition-colors group-hover:text-rose-500" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </>
        )}

        <div className="pb-10">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-[11px] text-stone-500 backdrop-blur-sm sm:rounded-3xl">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-rose-400" />
              Made to order · ships India-wide
            </span>
            <Link
              href="/"
              className="font-semibold text-rose-600 transition-colors hover:text-rose-700"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
