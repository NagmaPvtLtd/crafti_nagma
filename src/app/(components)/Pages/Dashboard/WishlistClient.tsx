"use client";

import { useMemo, useState, type ElementType } from "react";
import Link from "next/link";
import {
  Bookmark,
  Feather,
  Flower,
  Flower2,
  Gift,
  Heart,
  IndianRupee,
  KeyRound,
  Moon,
  Rabbit,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
} from "lucide-react";
import toast from "react-hot-toast";

import PageWrapper from "../../utils/PageWrapper";
import { SectionDivider, SectionEyebrow } from "../../utils/SectionDiv";

/* ------------------------------------------------------------------ */
/*  Types & static wishlist data                                       */
/* ------------------------------------------------------------------ */

type WishlistItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  mrp: number;
  rating: number;
  reviews: number;
  inStock: boolean;
  addedLabel: string;
  /** Tailwind gradient classes used for the placeholder artwork. */
  accent: string;
  icon: ElementType;
};

const WISHLIST_ITEMS: WishlistItem[] = [
  {
    id: "wl-01",
    name: "Rose Garden Granny Square Blanket",
    category: "Home Decor",
    price: 2499,
    mrp: 3299,
    rating: 4.8,
    reviews: 36,
    inStock: true,
    addedLabel: "2 days ago",
    accent: "from-rose-100 via-rose-50 to-amber-50",
    icon: Flower2,
  },
  {
    id: "wl-02",
    name: "Lavender Dreams Amigurumi Bunny",
    category: "Soft Toys",
    price: 899,
    mrp: 1199,
    rating: 4.9,
    reviews: 58,
    inStock: true,
    addedLabel: "4 days ago",
    accent: "from-violet-100 via-purple-50 to-rose-50",
    icon: Rabbit,
  },
  {
    id: "wl-03",
    name: "Golden Petal Embroidered Hoop",
    category: "Embroidery",
    price: 1299,
    mrp: 1599,
    rating: 4.7,
    reviews: 24,
    inStock: true,
    addedLabel: "1 week ago",
    accent: "from-amber-100 via-amber-50 to-rose-50",
    icon: Flower,
  },
  {
    id: "wl-04",
    name: "Personalised Name Keychain Set",
    category: "Personalised",
    price: 499,
    mrp: 699,
    rating: 4.6,
    reviews: 112,
    inStock: true,
    addedLabel: "1 week ago",
    accent: "from-emerald-100 via-emerald-50 to-amber-50",
    icon: KeyRound,
  },
  {
    id: "wl-05",
    name: "Boho Fringe Wall Hanging",
    category: "Home Decor",
    price: 1899,
    mrp: 2499,
    rating: 4.5,
    reviews: 19,
    inStock: false,
    addedLabel: "2 weeks ago",
    accent: "from-stone-100 via-amber-50 to-rose-50",
    icon: Feather,
  },
  {
    id: "wl-06",
    name: "Pastel Tulip Bookmark Duo",
    category: "Accessories",
    price: 349,
    mrp: 499,
    rating: 4.4,
    reviews: 67,
    inStock: true,
    addedLabel: "2 weeks ago",
    accent: "from-sky-100 via-sky-50 to-rose-50",
    icon: Bookmark,
  },
  {
    id: "wl-07",
    name: "Midnight Bloom Cushion Cover",
    category: "Home Decor",
    price: 1099,
    mrp: 1499,
    rating: 4.6,
    reviews: 31,
    inStock: true,
    addedLabel: "3 weeks ago",
    accent: "from-indigo-100 via-indigo-50 to-rose-50",
    icon: Moon,
  },
  {
    id: "wl-08",
    name: "Tiny Treasures Gift Hamper",
    category: "Gift Sets",
    price: 2199,
    mrp: 2799,
    rating: 4.9,
    reviews: 41,
    inStock: false,
    addedLabel: "1 month ago",
    accent: "from-rose-100 via-amber-50 to-emerald-50",
    icon: Gift,
  },
];

/* ------------------------------------------------------------------ */
/*  Filters & format helpers                                           */
/* ------------------------------------------------------------------ */

const FILTERS = [
  { key: "all", label: "All items" },
  { key: "in-stock", label: "In stock" },
  { key: "out-of-stock", label: "Out of stock" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

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

  const totalValue = useMemo(
    () => items.reduce((sum, i) => sum + i.price, 0),
    [items],
  );

  const bestSaving = useMemo(
    () => items.reduce((best, i) => Math.max(best, i.mrp - i.price), 0),
    [items],
  );

  const removeItem = (item: WishlistItem) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    toast.success(`${item.name} removed from wishlist`);
  };

  const moveToCart = (item: WishlistItem) => {
    toast.success(`${item.name} moved to cart`);
  };

  const snapshot = [
    {
      label: "Saved items",
      value: items.length.toLocaleString("en-IN"),
      hint: "Across every category",
      icon: <Heart className="h-3.5 w-3.5" />,
    },
    {
      label: "Wishlist value",
      value: inr(totalValue),
      hint: "At current prices",
      icon: <IndianRupee className="h-3.5 w-3.5" />,
    },
    {
      label: "Ready to ship",
      value: countOf(items, "in-stock").toLocaleString("en-IN"),
      hint: "In stock right now",
      icon: <ShoppingBag className="h-3.5 w-3.5" />,
    },
    {
      label: "Best saving",
      value: inr(bestSaving),
      hint: "On a single piece",
      icon: <Sparkles className="h-3.5 w-3.5" />,
    },
  ];

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
                <SectionEyebrow>Saved for later</SectionEyebrow>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
                  My Wishlist
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
                  Keep every handmade piece you love in one place — revisit it
                  anytime and move it to your cart when the moment feels right.
                </p>
              </div>

              <Link
                href="/shop"
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-rose-200/70 bg-white/70 px-3.5 py-2 text-xs font-semibold text-rose-600 backdrop-blur-sm transition-colors hover:border-rose-300 hover:bg-rose-50"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                Browse shop
              </Link>
            </div>
          </div>
        </section>

        <SectionDivider className="mx-auto max-w-7xl px-4 sm:px-6" />

        {/* Body */}
        <section className="relative">
          <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16">
            <div className="space-y-8">
              {/* Snapshot */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {snapshot.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-2xl border border-white/60 bg-white/85 px-3 py-3 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:bg-white hover:shadow-lg hover:shadow-rose-100/60 sm:rounded-3xl sm:px-4 sm:py-3.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-stone-900">{s.icon}</span>
                      <p className="truncate text-[10px] font-semibold tracking-wider text-rose-500/80 uppercase">
                        {s.label}
                      </p>
                    </div>
                    <p className="mt-1.5 truncate text-base font-semibold tabular-nums text-stone-900 sm:text-lg">
                      {s.value}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-stone-400">
                      {s.hint}
                    </p>
                  </div>
                ))}
              </div>

              {/* Section heading + filters */}
              <div>
                <div className="mb-4 max-w-2xl">
                  <SectionEyebrow>Curated by you</SectionEyebrow>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
                    Pieces you have saved
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-stone-600">
                    Handpicked handmade favourites — filter them, and keep only
                    what still sparks joy.
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
        </section>
      </div>
    </PageWrapper>
  );
}

/* ------------------------------------------------------------------ */
/*  Wishlist card                                                      */
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
  const Icon = item.icon;
  const discount = discountPct(item);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/85 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:bg-white hover:shadow-lg hover:shadow-rose-100/60 sm:rounded-3xl">
      {/* Artwork */}
      <div
        className={`relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-linear-to-br ${item.accent}`}
      >
        <Icon
          aria-hidden
          className="h-12 w-12 text-rose-400/70 transition-transform duration-300 group-hover:scale-110"
          strokeWidth={1.25}
        />

        {discount > 0 && (
          <span className="absolute top-2.5 left-2.5 rounded-full border border-rose-200/70 bg-white/85 px-2 py-0.5 text-[10px] font-semibold text-rose-600 backdrop-blur-sm">
            {discount}% off
          </span>
        )}

        <button
          type="button"
          onClick={() => onRemove(item)}
          aria-label={`Remove ${item.name} from wishlist`}
          title="Remove from wishlist"
          className="absolute top-2.5 right-2.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-rose-200/70 bg-white/85 text-rose-500 backdrop-blur-sm transition-colors hover:border-rose-500 hover:bg-rose-500 hover:text-white"
        >
          <Heart className="h-4 w-4 fill-current" />
        </button>

        {!item.inStock && (
          <span className="absolute bottom-2.5 left-2.5 rounded-full border border-stone-200/70 bg-white/85 px-2 py-0.5 text-[10px] font-semibold text-stone-600 backdrop-blur-sm">
            Out of stock
          </span>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="text-[10px] font-semibold tracking-wider text-rose-400 uppercase">
          {item.category}
        </p>
        <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-stone-900">
          {item.name}
        </h3>

        <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] text-stone-500">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span className="font-medium text-stone-700">
            {item.rating.toFixed(1)}
          </span>
          <span>({item.reviews})</span>
          <span aria-hidden className="mx-0.5 text-stone-300">
            •
          </span>
          <span>Added {item.addedLabel}</span>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-base font-semibold tabular-nums text-stone-900">
            {inr(item.price)}
          </span>
          {item.mrp > item.price && (
            <span className="text-xs text-stone-400 line-through tabular-nums">
              {inr(item.mrp)}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center gap-2 pt-4">
          <button
            type="button"
            onClick={() => onMoveToCart(item)}
            disabled={!item.inStock}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-rose-500 px-3 py-2 text-xs font-medium text-white shadow-sm shadow-rose-500/25 transition hover:bg-rose-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500 disabled:shadow-none"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            {item.inStock ? "Move to cart" : "Out of stock"}
          </button>
          <button
            type="button"
            onClick={() => onRemove(item)}
            className="cursor-pointer rounded-full border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-50"
          >
            Remove
          </button>
        </div>
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
          href="/shop"
          className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-4 py-2 text-xs font-medium text-white shadow-sm shadow-rose-500/25 transition hover:bg-rose-600 active:scale-[0.98]"
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          Browse the shop
        </Link>
      )}
    </div>
  );
}

