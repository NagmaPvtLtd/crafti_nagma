"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CornerDownLeft,
  Flower2,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import CustomLoader from "../CustomLoader";
import PageWrapper from "../utils/PageWrapper";
import { SectionDivider, SectionEyebrow } from "../utils/SectionDiv";
import { inputClass } from "../utils/Form/fieldStyles";
import { useDebouncedValue } from "../utils/Hooks/useDebouncedValue";
import CollectionCard from "./CollectionCard";
import { formatCurrency } from "../../../utils/Formator/formatCurrency.util";
import type { CollectionsResponse } from "../../../types/Collection.types";

/* -------------------------------------------------------------------------- */
/*  /search — query header, price filter and the matching product grid        */
/* -------------------------------------------------------------------------- */

export default function SearchProducts() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim();

  const [input, setInput] = useState(query);
  const debouncedInput = useDebouncedValue(input);
  const [data, setData] = useState<CollectionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(0);
  const [bounds, setBounds] = useState<{ min: number; max: number } | null>(
    null,
  );

  useEffect(() => {
    const sync = () => setInput(query);
    sync();
  }, [query]);

  useEffect(() => {
    const reset = () => {
      setData(null);
      setError(null);
      setLoading(false);
    };

    if (!query) {
      reset();
      return;
    }

    let cancelled = false;
    const start = () => {
      setLoading(true);
      setError(null);
    };
    start();

    axios
      .get<CollectionsResponse>("/api/public/collections", {
        params: { search: query },
      })
      .then((res) => {
        if (cancelled) return;
        setData(res.data);

        /*
         * Bound the slider to the prices actually on screen, not the whole
         * catalogue: a search that returns only ₹100 products leaves no range
         * to drag, and that filter is hidden below.
         */
        const priced = res.data.products
          .map((product) => product.priceFrom)
          .filter((price): price is number => price !== null);

        if (priced.length > 0) {
          const min = Math.floor(Math.min(...priced));
          const max = Math.ceil(Math.max(...priced));
          setBounds({ min, max });
          setPriceMin(min);
          setPriceMax(max);
        } else {
          setBounds(null);
          setPriceMin(0);
          setPriceMax(0);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not run that search right now.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  const allProducts = data?.products ?? [];

  const products = allProducts.filter((product) => {
    const price = product.priceFrom;
    if (price === null) return false;
    if (bounds && priceMin > bounds.min && price < priceMin) return false;
    if (bounds && priceMax < bounds.max && price > priceMax) return false;
    return true;
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const term = input.trim();
    if (!term) {
      router.push("/search");
      return;
    }
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  function clearQuery() {
    setInput("");
    setData(null);
    router.push("/search");
  }

  /* Pausing after typing runs the search; the URL stays the source of truth.
     The debounced value only counts once it matches what is in the box —
     otherwise an older term would re-run the search after a clear or an
     instant Enter. */
  useEffect(() => {
    const term = debouncedInput.trim();
    if (term !== input.trim()) return;
    if (term === query) return;
    router.push(term ? `/search?q=${encodeURIComponent(term)}` : "/search");
  }, [debouncedInput, input, query, router]);

  /* A single price across every result leaves nothing to filter on. */
  const showPriceFilter = bounds !== null && bounds.max > bounds.min;

  const filtersActive =
    bounds !== null && (priceMin > bounds.min || priceMax < bounds.max);

  return (
    <PageWrapper variant="hero" position="fixed">
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-12 sm:px-6 sm:pt-10 sm:pb-16">
        <SectionEyebrow>Search</SectionEyebrow>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
          Find handmade treasures.
        </h1>

        <form onSubmit={submit} className="relative mt-4 w-full">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Search products, tags, categories…"
            aria-label="Search products"
            className={`${inputClass(false)} rounded-full py-2.5 pr-12 pl-10 text-sm`}
          />
          <button
            type="submit"
            aria-label="Search"
            title="Search (Enter)"
            className="absolute top-1/2 right-2 inline-flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center text-stone-400 transition-colors hover:text-rose-600"
          >
            <CornerDownLeft className="h-4 w-4" />
          </button>
        </form>

        {/* Mobile filters — horizontally scrollable, above the query line. */}
        {query && showPriceFilter && bounds && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-stone-600">
              <SlidersHorizontal className="h-3 w-3 text-rose-400" />
              Price
            </span>
            <label className="inline-flex shrink-0 items-center gap-1 rounded-full border border-stone-200 bg-white px-2.5 py-1.5 text-[11px] text-stone-500">
              Min
              <input
                type="number"
                min={bounds.min}
                max={priceMax}
                value={priceMin}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setPriceMin(Math.min(next, priceMax));
                }}
                className="w-16 rounded border-0 bg-transparent text-[11px] font-semibold text-stone-800 outline-none"
                aria-label="Minimum price"
              />
            </label>
            <label className="inline-flex shrink-0 items-center gap-1 rounded-full border border-stone-200 bg-white px-2.5 py-1.5 text-[11px] text-stone-500">
              Max
              <input
                type="number"
                min={priceMin}
                max={bounds.max}
                value={priceMax}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setPriceMax(Math.max(next, priceMin));
                }}
                className="w-16 rounded border-0 bg-transparent text-[11px] font-semibold text-stone-800 outline-none"
                aria-label="Maximum price"
              />
            </label>
            {filtersActive && (
              <button
                type="button"
                onClick={() => {
                  setPriceMin(bounds.min);
                  setPriceMax(bounds.max);
                }}
                className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-600"
              >
                <X className="h-3 w-3" />
                Reset
              </button>
            )}
          </div>
        )}

        {query && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-stone-600">
              Searched for{" "}
              <span className="font-semibold text-stone-900">“{query}”</span>
            </span>
            <button
              type="button"
              onClick={clearQuery}
              aria-label="Clear search"
              className="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
            >
              <X className="h-3 w-3" />
            </button>
            {!loading && (
              <span className="text-[11px] text-stone-500">
                · {products.length} result{products.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
        )}

        <SectionDivider className="my-6" size={11} />

        {!query ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-rose-200 bg-white/70 px-6 py-14 text-center backdrop-blur-sm sm:rounded-3xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-500">
              <Search className="h-5 w-5" />
            </div>
            <h2 className="mt-3 text-base font-semibold text-stone-900">
              Search to show products!
            </h2>
            <p className="mt-1 max-w-sm text-sm text-stone-600">
              Type a product name, a tag or a category above and we will find
              it.
            </p>
          </div>
        ) : loading ? (
          <CustomLoader fullScreen={false} label="Searching the catalogue…" />
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/70 px-5 py-6 text-sm text-rose-700">
            {error}
          </div>
        ) : (
          <div
            className={`grid grid-cols-1 gap-5 ${
              showPriceFilter ? "lg:grid-cols-[240px_1fr]" : ""
            }`}
          >
            {/* Desktop price filter */}
            {showPriceFilter && bounds && (
              <aside className="hidden lg:block">
                <div className="sticky top-24 rounded-2xl border border-rose-100 bg-white/85 p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-rose-400" />
                    <h2 className="text-xs font-semibold tracking-wider text-stone-700 uppercase">
                      Price
                    </h2>
                  </div>

                  <p className="mt-2 text-sm font-semibold tabular-nums text-stone-900">
                    {formatCurrency(priceMin)} – {formatCurrency(priceMax)}
                  </p>

                  <div className="mt-3 space-y-3">
                    <label className="block">
                      <span className="text-[10px] font-medium text-stone-500 uppercase">
                        Minimum
                      </span>
                      <input
                        type="range"
                        min={bounds.min}
                        max={bounds.max}
                        step={1}
                        value={priceMin}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          setPriceMin(Math.min(next, priceMax));
                        }}
                        className="mt-1 w-full cursor-pointer accent-rose-500"
                        aria-label="Minimum price"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-medium text-stone-500 uppercase">
                        Maximum
                      </span>
                      <input
                        type="range"
                        min={bounds.min}
                        max={bounds.max}
                        step={1}
                        value={priceMax}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          setPriceMax(Math.max(next, priceMin));
                        }}
                        className="mt-1 w-full cursor-pointer accent-rose-500"
                        aria-label="Maximum price"
                      />
                    </label>
                  </div>

                  {filtersActive && (
                    <button
                      type="button"
                      onClick={() => {
                        setPriceMin(bounds.min);
                        setPriceMax(bounds.max);
                      }}
                      className="mt-3 inline-flex cursor-pointer items-center gap-1 rounded-full border border-rose-200/70 bg-rose-50/60 px-2.5 py-1 text-[11px] font-semibold text-rose-600 transition-colors hover:bg-rose-100"
                    >
                      <X className="h-3 w-3" />
                      Reset price
                    </button>
                  )}
                </div>
              </aside>
            )}

            <div>
              {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-rose-200 bg-white/70 px-6 py-12 text-center backdrop-blur-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-500">
                    <Flower2 className="h-5 w-5" />
                  </div>
                  <h2 className="mt-3 text-sm font-semibold text-stone-900">
                    Nothing matched that search
                  </h2>
                  <p className="mt-1 max-w-sm text-xs text-stone-600">
                    Try another word, or clear the price filter.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((product) => (
                    <CollectionCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
