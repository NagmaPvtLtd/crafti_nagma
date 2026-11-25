"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { ArrowRight, ChevronRight, Flower2, Layers } from "lucide-react";

import CustomLoader from "../CustomLoader";
import PageWrapper from "../utils/PageWrapper";
import { SectionDivider, SectionEyebrow } from "../utils/SectionDiv";
import CollectionCard from "./CollectionCard";
import type { CollectionsResponse } from "../../../types/Collection.types";

/* -------------------------------------------------------------------------- */
/*  /collections/[category] and /collections/[category]/[subcategory]         */
/*  Real products for that category (subcategories included) or subcategory.  */
/* -------------------------------------------------------------------------- */

export default function CollectionBrowse({
  category,
  subcategory,
}: {
  category: string;
  subcategory?: string;
}) {
  const [data, setData] = useState<CollectionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get<CollectionsResponse>(
          "/api/public/collections",
          {
            params: {
              category,
              ...(subcategory ? { subcategory } : {}),
            },
          },
        );
        if (!cancelled) setData(res.data);
      } catch {
        if (!cancelled) setError("Could not load this collection right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [category, subcategory]);

  const rootCategory = useMemo(() => {
    const slug = category.toLowerCase();
    return (
      data?.categories.find((item) => item.slug.toLowerCase() === slug) ?? null
    );
  }, [data, category]);

  const scope = data?.scope ?? null;
  const notFound = scope !== null && !scope.found;
  const title = notFound
    ? "Category not found"
    : (scope?.name ?? category.replace(/-/g, " "));
  const products = data?.products ?? [];

  return (
    <PageWrapper variant="hero" position="fixed">
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-12 sm:px-6 sm:pt-10 sm:pb-16">
            <nav className="flex flex-wrap items-center gap-1 text-[11px] text-stone-500">
              <Link href="/" className="hover:text-rose-600">
                Home
              </Link>
              <ChevronRight className="h-3 w-3 text-stone-300" />
              <Link href="/collections" className="hover:text-rose-600">
                Collections
              </Link>
              {rootCategory && subcategory && (
                <>
                  <ChevronRight className="h-3 w-3 text-stone-300" />
                  <Link
                    href={rootCategory.href}
                    className="hover:text-rose-600"
                  >
                    {rootCategory.name}
                  </Link>
                </>
              )}
              <ChevronRight className="h-3 w-3 text-stone-300" />
              <span className="font-semibold text-stone-700">{title}</span>
            </nav>

            <SectionEyebrow className="mt-4">
              {subcategory ? "Subcategory" : "Category"}
            </SectionEyebrow>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
              {title}
            </h1>
            {notFound && (
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-600 sm:text-base">
                That category does not exist in the catalogue.
              </p>
            )}

        <SectionDivider className="my-6" size={11} />

            {rootCategory && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Link
                  href={rootCategory.href}
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
                    subcategory
                      ? "border-stone-200 bg-white/80 text-stone-600 hover:border-rose-200 hover:text-stone-900"
                      : "border-rose-300 bg-rose-50 text-rose-700"
                  }`}
                >
                  All {rootCategory.name}
                  <span className="ml-1 text-[10px] opacity-70">
                    {rootCategory.totalProductCount}
                  </span>
                </Link>

                {rootCategory.subcategories.map((sub) => {
                  const active =
                    subcategory?.toLowerCase() === sub.slug.toLowerCase();
                  return (
                    <Link
                      key={sub.id}
                      href={sub.href}
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
                        active
                          ? "border-rose-300 bg-rose-50 text-rose-700"
                          : "border-stone-200 bg-white/80 text-stone-600 hover:border-rose-200 hover:text-stone-900"
                      }`}
                    >
                      {sub.name}
                      <span className="ml-1 text-[10px] opacity-70">
                        {sub.productCount}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}

            {loading ? (
              <CustomLoader fullScreen={false} label="Loading products…" />
            ) : error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/70 px-5 py-6 text-sm text-rose-700">
                {error}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-rose-200 bg-white/70 px-6 py-14 text-center backdrop-blur-sm sm:rounded-3xl">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-500">
                  <Flower2 className="h-5 w-5" />
                </div>
                <h2 className="mt-3 text-base font-semibold text-stone-900">
                  Nothing here yet
                </h2>
                <p className="mt-1 max-w-sm text-sm text-stone-600">
                  No products are filed under this collection at the moment.
                </p>
                <Link
                  href="/collections"
                  className="mt-4 inline-flex items-center gap-1 rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-stone-800"
                >
                  Browse everything
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-stone-500">
                    <Layers className="h-3 w-3 text-rose-400" />
                    {products.length} product{products.length === 1 ? "" : "s"}
                  </span>
                  <Link
                    href="/collections"
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700"
                  >
                    All collections
                  </Link>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {products.map((product) => (
                    <CollectionCard key={product.id} product={product} />
                  ))}
                </div>
              </>
            )}
      </div>
    </PageWrapper>
  );
}
