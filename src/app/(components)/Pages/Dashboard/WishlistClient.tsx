"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Flower2,
  Heart,
  ShoppingBag,
  SlidersHorizontal,
  Star,
} from "lucide-react";
import toast from "react-hot-toast";

import PageWrapper from "../../utils/PageWrapper";
import { SectionDivider, SectionEyebrow } from "../../utils/SectionDiv";
import { formatCurrency } from "../../../../utils/Formator/formatCurrency.util";

/* ------------------------------------------------------------------ */
/*  Types & wishlist data                                              */
/* ------------------------------------------------------------------ */

type WishlistItem = {
  id: string;
  name: string;
  category: string;
  href: string;
  imageUrl: string | null;
  briefDescription: string | null;
  price: number;
  mrp: number;
  rating: number;
  reviews: number;
  inStock: boolean;
  addedLabel: string;
};

/**
 * Cleared until the wishlist backend lands — no sample products. The card
 * below mirrors `CollectionCard`, so real rows drop straight in.
 */
const WISHLIST_ITEMS: WishlistItem[] = [];

/* ------------------------------------------------------------------ */
/*  Filters & format helpers                                           */
/* ------------------------------------------------------------------ */

const FILTERS = [
  { key: "all", label: "All items" },
  { key: "in-stock", label: "In stock" },
  { key: "out-of-stock", label: "Out of stock" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

const countOf = (items: WishlistItem[], key: FilterKey) => {
  if (key === "in-stock") return items.filter((i) => i.inStock).length;
  if (key === "out-of-stock") return items.filter((i) => !i.inStock).length;
  return items.length;
};

const discountPct = (item: WishlistItem) =>
  item.mrp > item.price
    ? Math.round(((item.mrp - item.price) / item.mrp) * 100)
    : 0;

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

export default function WishlistClient() {
  const [items, setItems] = useState<WishlistItem[]>(WISHLIST_ITEMS);
  const [filter, setFilter] = useState<FilterKey>("all");

  const visible = useMemo(() => {
    if (filter === "in-stock") return items.filter((i) => i.inStock);
    if (filter === "out-of-stock") return items.filter((i) => !i.inStock);
    return items;
  }, [items, filter]);

  const removeItem = (item: WishlistItem) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    toast.success(`${item.name} removed from wishlist`);
  };

  const moveToCart = (item: WishlistItem) => {
    toast.success(`${item.name} moved to cart`);
  };

  return (
    <PageWrapper variant="content" position="fixed">
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-12 sm:px-6 sm:pt-10 sm:pb-16">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <SectionEyebrow>Saved for later</SectionEyebrow>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
              My Wishlist
            </h1>
          </div>

          <Link
            href="/collections"
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-rose-200/70 bg-white/70 px-3.5 py-2 text-xs font-semibold text-rose-600 backdrop-blur-sm transition-colors hover:border-rose-300 hover:bg-rose-50"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Browse collections
          </Link>
        </div>

        <SectionDivider className="my-6" size={11} />

        <div className="space-y-8">
          {/* Section heading + filters */}
          <div>
            <div className="mb-4 max-w-2xl">
              <SectionEyebrow>Curated by you</SectionEyebrow>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
                Pieces you have saved
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-stone-600">
                Handpicked handmade favourites — filter them, and keep only what
                still sparks joy.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <SlidersHorizontal
                  aria-hidden
                  className="mr-1 h-3.5 w-3.5 text-stone-400"
                />
                {FILTERS.map((f) => {
                  const active = filter === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setFilter(f.key)}
                      aria-pressed={active}
                      className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        active
                          ? "border-rose-500 bg-rose-500 text-white shadow-sm shadow-rose-500/25"
                          : "border-stone-200 bg-white/70 text-stone-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                      }`}
                    >
                      {f.label}
                      <span
                        className={`ml-1.5 tabular-nums ${
                          active ? "text-white/75" : "text-stone-400"
                        }`}
                      >
                        {countOf(items, f.key)}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-stone-500">
                Showing{" "}
                <span className="font-semibold text-stone-700">
                  {visible.length}
                </span>{" "}
                of {items.length} saved
              </p>
            </div>
          </div>

          {/* Grid / empty state */}
          {visible.length === 0 ? (
            <EmptyState
              hasItems={items.length > 0}
              filter={filter}
              onReset={() => setFilter("all")}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((item) => (
                <WishlistCard
                  key={item.id}
                  item={item}
                  onRemove={removeItem}
                  onMoveToCart={moveToCart}
                />
              ))}
            </div>
          )}

          {/* Footnote */}
          <div className="flex items-start gap-2.5 rounded-2xl border border-white/60 bg-white/85 px-4 py-3 text-xs leading-relaxed text-stone-500 backdrop-blur-sm sm:rounded-3xl">
            <Heart className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
            <p>
              Wishlist items stay saved to your account — prices and
              availability are refreshed every time you visit.
            </p>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

/* ------------------------------------------------------------------ */
/*  Wishlist card — same skeleton as CollectionCard                    */
/* ------------------------------------------------------------------ */

function WishlistCard({
  item,
  onRemove,
  onMoveToCart,
}: {
  item: WishlistItem;
  onRemove: (item: WishlistItem) => void;
  onMoveToCart: (item: WishlistItem) => void;
}) {
  const discount = discountPct(item);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-(--card-radius) border border-rose-100 bg-white transition-all [--card-radius:1rem] hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-lg hover:shadow-rose-100/60 sm:[--card-radius:1.5rem]">
      {/* Card-wide link sits under the buttons. */}
      <Link
        href={item.href}
        aria-label={`View ${item.name}`}
        className="absolute inset-0 z-10"
      />

      <div className="relative overflow-hidden bg-linear-to-br from-rose-50 via-white to-amber-50">
        <div className="relative aspect-square w-full">
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              loading={"eager"}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="card-photo object-cover transition-transform duration-300 group-hover:scale-103"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Flower2 className="h-12 w-12 text-rose-300" />
            </div>
          )}
        </div>

        {discount > 0 && (
          <span className="absolute top-3 left-3 z-20 rounded-md bg-white/95 px-2 py-1 text-[9px] leading-none font-bold tracking-[0.14em] text-rose-600 uppercase shadow-sm ring-1 ring-rose-100">
            {discount}% off
          </span>
        )}

        {!item.inStock && (
          <span className="absolute bottom-3 left-3 z-20 rounded-full bg-stone-900/80 px-2 py-0.5 text-[10px] font-semibold text-white">
            Out of stock
          </span>
        )}

        <button
          type="button"
          onClick={() => onRemove(item)}
          aria-label={`Remove ${item.name} from wishlist`}
          title="Remove from wishlist"
          className="absolute top-2.5 right-2.5 z-20 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/90 text-rose-500 shadow-sm ring-1 ring-stone-200/70 transition-colors hover:bg-rose-500 hover:text-white hover:ring-rose-200"
        >
          <Heart className="h-4 w-4 fill-current" />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[10px] font-semibold tracking-wider text-rose-400 uppercase">
          {item.category}
        </p>

        <h3 className="mt-1 line-clamp-2 text-base leading-snug font-semibold tracking-tight text-stone-900 sm:text-lg">
          {item.name}
        </h3>

        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-stone-500 sm:text-xs">
          {item.briefDescription ?? "Handmade in small batches, made to order."}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px] text-stone-500">
          <Star className="mb-0.5 h-3 w-3 fill-amber-400 text-amber-400" />
          <span className="font-medium text-stone-700">
            {item.rating.toFixed(1)}
          </span>
          <span>({item.reviews})</span>
          <span aria-hidden className="mx-0.5 text-stone-300">
            ·
          </span>
          <span>Added {item.addedLabel}</span>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-base font-semibold tabular-nums text-stone-900">
            {formatCurrency(item.price)}
          </span>
          {item.mrp > item.price && (
            <span className="text-xs text-stone-400 line-through tabular-nums">
              {formatCurrency(item.mrp)}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onMoveToCart(item)}
          disabled={!item.inStock}
          className="relative z-20 mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-rose-500 px-3 py-2 text-[11px] font-semibold text-white shadow-sm shadow-rose-500/25 transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500 disabled:shadow-none"
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          {item.inStock ? "Move to cart" : "Out of stock"}
        </button>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

function EmptyState({
  hasItems,
  filter,
  onReset,
}: {
  hasItems: boolean;
  filter: FilterKey;
  onReset: () => void;
}) {
  const title = !hasItems
    ? "Your wishlist is empty"
    : filter === "out-of-stock"
      ? "Nothing out of stock"
      : "No in-stock pieces right now";

  const body = !hasItems
    ? "Tap the heart on any product to keep it here — your favourites will be waiting for you."
    : filter === "out-of-stock"
      ? "Every saved piece is available right now. Lovely news."
      : "Your saved pieces are out of stock at the moment. We are restocking soon.";

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/60 bg-white/85 px-6 py-12 text-center backdrop-blur-sm sm:rounded-3xl sm:py-16">
      <span className="flex h-14 w-14 items-center justify-center rounded-full border border-rose-200/70 bg-rose-50 text-rose-400">
        <Heart aria-hidden className="h-6 w-6" strokeWidth={1.5} />
      </span>

      <h3 className="mt-4 text-base font-semibold text-stone-900">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-stone-600">
        {body}
      </p>

      {hasItems ? (
        <button
          type="button"
          onClick={onReset}
          className="mt-5 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-rose-200/70 bg-white px-4 py-2 text-xs font-semibold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Show all items
        </button>
      ) : (
        <Link
          href="/collections"
          className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-4 py-2 text-xs font-medium text-white shadow-sm shadow-rose-500/25 transition hover:bg-rose-600 active:scale-[0.98]"
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          Browse the collections
        </Link>
      )}
    </div>
  );
}
