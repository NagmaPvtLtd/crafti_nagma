"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { ChevronRight, Flower2 } from "lucide-react";

import CustomLoader from "../CustomLoader";
import PageWrapper from "../utils/PageWrapper";
import { SectionDivider, SectionEyebrow } from "../utils/SectionDiv";
import CategoryCard from "./CategoryCard";
import type { CollectionsResponse } from "../../../types/Collection.types";

/* -------------------------------------------------------------------------- */
/*  /categories — every category that actually holds a product                */
/* -------------------------------------------------------------------------- */

export default function CategoryList() {
  const [data, setData] = useState<CollectionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await axios.get<CollectionsResponse>(
          "/api/public/collections",
        );
        if (!cancelled) setData(res.data);
      } catch {
        if (!cancelled) setError("Could not load the categories right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  /* A category with nothing inside it is not worth a shelf. */
  const categories = useMemo(
    () =>
      (data?.categories ?? []).filter(
        (category) => category.totalProductCount > 0,
      ),
    [data],
  );

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
          <ChevronRight className="h-3 w-3 text-stone-300" />
          <span className="font-semibold text-stone-700">Categories</span>
        </nav>

        <SectionEyebrow className="mt-4">Categories</SectionEyebrow>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
          Browse by category
        </h1>

        <SectionDivider className="my-6" size={11} />

        {loading ? (
          <CustomLoader fullScreen={false} label="Gathering the categories…" />
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/70 px-5 py-6 text-sm text-rose-700">
            {error}
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-rose-200 bg-white/70 px-6 py-14 text-center backdrop-blur-sm sm:rounded-3xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-500">
              <Flower2 className="h-5 w-5" />
            </div>
            <h2 className="mt-3 text-base font-semibold text-stone-900">
              No categories yet
            </h2>
            <p className="mt-1 max-w-sm text-sm text-stone-600">
              A category appears here once a product is filed under it.
            </p>
            <Link
              href="/collections"
              className="mt-4 inline-flex items-center gap-1 rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-stone-800"
            >
              Browse everything
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
