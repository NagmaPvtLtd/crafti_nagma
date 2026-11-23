"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import useEmblaCarousel from "embla-carousel-react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Flower2,
  Search,
  Sparkles,
} from "lucide-react";

import CustomLoader from "../CustomLoader";
import PageWrapper from "../utils/PageWrapper";
import { SectionDivider, SectionEyebrow } from "../utils/SectionDiv";
import { inputClass } from "../utils/Form/fieldStyles";
import CollectionCard from "./CollectionCard";
import type { CollectionsResponse } from "../../../types/Collection.types";
import { useRouter } from "next/navigation";

/* -------------------------------------------------------------------------- */
/*  /collections — featured carousel, category thumbnails, search & product    */
/*  grid that reveals the next batch as the shopper scrolls.                   */
/* -------------------------------------------------------------------------- */

const GRID_BATCH = 8;

export default function Collections() {
  const router = useRouter();

  const [data, setData] = useState<CollectionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(GRID_BATCH);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
  });
  const [catRef, catApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
  });

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

  const featured = data?.featured ?? [];
  /* A category with nothing inside it is not worth a shelf. */
  const categories = useMemo(
    () =>
      (data?.categories ?? []).filter(
        (category) => category.totalProductCount > 0,
      ),
    [data],
  );
  const products = useMemo(() => data?.products ?? [], [data]);

  useEffect(() => {
    const reset = () => setVisibleCount(GRID_BATCH);
    reset();
  }, [data]);

  /* The next batch is revealed well before the shopper reaches the end, so
     scrolling never waits on a request or a spinner. */
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setVisibleCount((count) =>
          Math.min(count + GRID_BATCH, products.length),
        );
      },
      { rootMargin: "800px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [products.length, visibleCount]);

  const scrollFeatured = useCallback(
    (direction: -1 | 1) => {
      if (!emblaApi) return;
      if (direction === -1) emblaApi.scrollPrev();
      else emblaApi.scrollNext();
    },
    [emblaApi],
  );

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const term = query.trim();
    router.push(term ? `/search?q=${encodeURIComponent(term)}` : "/search");
  }

  const visibleProducts = products.slice(0, visibleCount);

  return (
    <PageWrapper variant="hero" position="fixed">
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-12 sm:px-6 sm:pt-10 sm:pb-16">
        <SectionEyebrow>Browse our Collection</SectionEyebrow>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
          Our collection
        </h1>

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
            {/* ---------------- 1. Featured ---------------- */}
            <section className="relative">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  <SectionEyebrow>Featured</SectionEyebrow>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
                    Featured products
                  </h2>
                  <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-stone-600">
                    The pieces we are proudest of right now — drag to browse the
                    shelf.
                  </p>
                </div>

                {featured.length > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => scrollFeatured(-1)}
                      aria-label="Previous featured products"
                      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-rose-200/70 bg-white text-stone-600 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollFeatured(1)}
                      aria-label="Next featured products"
                      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-rose-200/70 bg-white text-stone-600 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {featured.length === 0 ? (
                <p className="mt-4 rounded-2xl border border-dashed border-rose-200 bg-white/70 px-4 py-6 text-center text-xs text-stone-500">
                  Nothing is marked as featured yet.
                </p>
              ) : (
                <div className="overflow-hidden" ref={emblaRef}>
                  <div className="-ml-3 flex touch-pan-y select-none">
                    {featured.map((product) => (
                      <div
                        key={product.id}
                        className="min-w-0 shrink-0 grow-0 basis-[82%] pl-3 sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                      >
                        <CollectionCard product={product} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <SectionDivider className="my-8" size={11} />

            {/* ---------------- 2. Categories ---------------- */}
            <section className="relative">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  <SectionEyebrow>Categories</SectionEyebrow>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
                    Browse by category
                  </h2>
                  <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-stone-600">
                    Each shelf holds its own story — pick a category to see every
                    product inside it.
                  </p>
                </div>

                {categories.length > 2 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => catApi?.scrollPrev()}
                      aria-label="Previous categories"
                      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-rose-200/70 bg-white text-stone-600 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => catApi?.scrollNext()}
                      aria-label="Next categories"
                      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-rose-200/70 bg-white text-stone-600 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {categories.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-rose-200 bg-white/70 px-4 py-6 text-center text-xs text-stone-500">
                  No categories have been created yet.
                </p>
              ) : (
                <div className="overflow-hidden" ref={catRef}>
                  <div className="-ml-2.5 flex touch-pan-y select-none">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        className="min-w-0 shrink-0 grow-0 basis-[44%] pl-2.5 sm:basis-[30%] md:basis-1/4 lg:basis-1/5 xl:basis-[16%]"
                      >
                        <Link
                          href={category.href}
                          className="group flex flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/85 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:bg-white hover:shadow-lg hover:shadow-rose-100/60"
                        >
                          <div className="relative aspect-square overflow-hidden bg-linear-to-br from-rose-100 via-rose-50 to-amber-50">
                            {category.thumbnailUrl ? (
                              <Image
                                src={category.thumbnailUrl}
                                alt={category.name}
                                fill
                                sizes="(max-width: 640px) 44vw, (max-width: 1024px) 25vw, 20vw"
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <Flower2 className="h-7 w-7 text-rose-300" />
                              </div>
                            )}
                          </div>

                          <div className="p-2.5">
                            <div className="flex items-center justify-between gap-1.5">
                              <h3 className="truncate text-xs font-semibold text-stone-900 group-hover:text-rose-600">
                                {category.name}
                              </h3>
                              <ArrowRight className="h-3 w-3 shrink-0 text-rose-500 transition-transform group-hover:translate-x-0.5" />
                            </div>
                            <p className="mt-0.5 text-[10px] font-medium text-rose-600">
                              {category.totalProductCount} product
                              {category.totalProductCount === 1 ? "" : "s"}{" "}
                              available!
                            </p>
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <SectionDivider className="my-8" size={11} />

            {/* ---------------- 3. Search + product grid ---------------- */}
            <section className="relative" id="all-products">
              <div className="mb-4">
                <SectionEyebrow>All Products</SectionEyebrow>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
                  Find your next treasure
                </h2>
              </div>

              <form onSubmit={submitSearch} className="relative w-full">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search products, tags, categories…"
                  aria-label="Search products"
                  className={`${inputClass(false)} rounded-full py-3 pr-28 pl-10 text-sm`}
                />
                <button
                  type="submit"
                  className="absolute top-1/2 right-1.5 -translate-y-1/2 cursor-pointer rounded-full bg-stone-900 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-stone-800"
                >
                  Search
                </button>
              </form>

              {products.length === 0 ? (
                <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-rose-200 bg-white/70 px-6 py-12 text-center backdrop-blur-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-500">
                    <Flower2 className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-stone-900">
                    No products yet
                  </h3>
                  <p className="mt-1 max-w-sm text-xs text-stone-600">
                    Products added in the studio will appear here.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {visibleProducts.map((product) => (
                      <CollectionCard key={product.id} product={product} />
                    ))}
                  </div>

                  {visibleCount < products.length && (
                    <div
                      ref={sentinelRef}
                      className="flex items-center justify-center py-6 text-[11px] text-stone-400"
                    >
                      Loading more products…
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        )}

        <div className="pt-10">
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
