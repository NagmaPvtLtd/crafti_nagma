"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ArrowRight,
  Flower2,
  Frame,
  Heart,
  Home,
  KeyRound,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  X,
} from "lucide-react";

import PageWrapper from "../utils/PageWrapper";
import { SectionDivider, SectionEyebrow } from "../utils/SectionDiv";
import { inputClass } from "../utils/Form/fieldStyles";

/* ------------------------------------------------------------------ */
/*  Sample data — not wired to the API yet                             */
/* ------------------------------------------------------------------ */

type SampleProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  compareAt?: number;
  badge?: "Bestseller" | "New";
  blurb: string;
  rating: number;
  reviews: number;
  tone: string;
  icon: "flower" | "heart" | "key" | "frame" | "home";
};

const CATEGORIES = [
  "All",
  "Bouquets",
  "Plushies",
  "Keychains",
  "Wall art",
  "Home",
] as const;

const TONE = {
  blush: "from-rose-100 via-rose-50 to-amber-50 text-rose-400",
  sunny: "from-amber-100 via-amber-50 to-white text-amber-500",
  mint: "from-emerald-100 via-emerald-50 to-white text-emerald-500",
  sky: "from-sky-100 via-sky-50 to-white text-sky-500",
  lilac: "from-violet-100 via-violet-50 to-white text-violet-400",
} as const;

const PRODUCTS: SampleProduct[] = [
  {
    id: "blush-bouquet",
    name: "Blush Bouquet",
    category: "Bouquets",
    price: 899,
    compareAt: 1099,
    badge: "Bestseller",
    blurb: "Roses and tulips in dusty pink, tied with a satin ribbon.",
    rating: 5,
    reviews: 32,
    tone: TONE.blush,
    icon: "flower",
  },
  {
    id: "sunflower-bunch",
    name: "Sunny Sunflower Bunch",
    category: "Bouquets",
    price: 749,
    blurb: "Five cheerful sunflowers that never need watering.",
    rating: 4.8,
    reviews: 21,
    tone: TONE.sunny,
    icon: "flower",
  },
  {
    id: "amigurumi-bunny",
    name: "Amigurumi Bunny",
    category: "Plushies",
    price: 649,
    badge: "New",
    blurb: "A palm-sized bunny with floppy ears and a tiny bow.",
    rating: 5,
    reviews: 14,
    tone: TONE.mint,
    icon: "heart",
  },
  {
    id: "bear-keychain",
    name: "Little Bear Keychain",
    category: "Keychains",
    price: 249,
    blurb: "Pocket-sized bear charm for keys, bags and everything else.",
    rating: 4.7,
    reviews: 41,
    tone: TONE.sky,
    icon: "key",
  },
  {
    id: "embroidery-hoop",
    name: "Wildflower Hoop",
    category: "Wall art",
    price: 1199,
    compareAt: 1399,
    blurb: "Hand-embroidered wildflowers in a 8\" bamboo hoop.",
    rating: 4.9,
    reviews: 18,
    tone: TONE.lilac,
    icon: "frame",
  },
  {
    id: "cloud-pillow",
    name: "Cloud Cuddle Pillow",
    category: "Home",
    price: 1499,
    badge: "Bestseller",
    blurb: "Chunky-knit cloud cushion, soft enough to nap on.",
    rating: 5,
    reviews: 27,
    tone: TONE.sky,
    icon: "home",
  },
  {
    id: "daisy-bookmark",
    name: "Daisy Bookmark",
    category: "Keychains",
    price: 199,
    blurb: "A tiny daisy that keeps your page exactly where you left it.",
    rating: 4.6,
    reviews: 9,
    tone: TONE.mint,
    icon: "key",
  },
  {
    id: "coaster-set",
    name: "Cozy Coaster Set",
    category: "Home",
    price: 499,
    badge: "New",
    blurb: "Four round coasters in warm neutrals, bundled together.",
    rating: 4.8,
    reviews: 11,
    tone: TONE.blush,
    icon: "home",
  },
];

const ICONS = {
  flower: Flower2,
  heart: Heart,
  key: KeyRound,
  frame: Frame,
  home: Home,
} as const;

const inr = (value: number) => `₹${value.toLocaleString("en-IN")}`;

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function Collections() {
  const [category, setCategory] = useState<string>("All");
  const [query, setQuery] = useState("");

  /* links like /collections?category=Bouquets&q=daisy open with the filter set */
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      const search = params.get("q")?.trim();
      const requested = params.get("category");

      if (search) setQuery(search);
      if (requested && (CATEGORIES as readonly string[]).includes(requested)) {
        setCategory(requested);
      }
    });

    return () => cancelAnimationFrame(id);
  }, []);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();

    return PRODUCTS.filter((product) => {
      const matchesCategory =
        category === "All" || product.category === category;
      const matchesQuery =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term);

      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  return (
    <PageWrapper variant="hero" position="fixed">
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
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <SectionEyebrow>Collections · sample catalogue</SectionEyebrow>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
                  Handmade, ready to gift.
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-600 sm:text-base">
                  Small-batch crochet pieces, made to order in India. Pick a
                  design and we&apos;ll stitch it just for you.
                </p>
              </div>

              <div className="flex w-full gap-2 sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search the collection"
                    aria-label="Search the collection"
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
            </div>
          </div>
        </section>

        <SectionDivider className="mx-auto max-w-7xl px-4 sm:px-6" />

        {/* Filters + grid */}
        <section className="relative">
          <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {CATEGORIES.map((item) => {
                const active = item === category;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    aria-pressed={active}
                    className={`cursor-pointer rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
                      active
                        ? "border-rose-300 bg-rose-50 text-rose-700"
                        : "border-stone-200 bg-white/80 text-stone-600 hover:border-rose-200 hover:text-stone-900"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}

              <span className="ml-auto text-[11px] text-stone-500">
                {visible.length} of {PRODUCTS.length} pieces
              </span>
            </div>

            {visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-rose-200 bg-white/70 px-6 py-14 text-center backdrop-blur-sm sm:rounded-3xl">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-500">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <h2 className="mt-3 text-base font-semibold text-stone-900">
                  Nothing matches yet
                </h2>
                <p className="mt-1 max-w-sm text-sm text-stone-600">
                  Try another category, or clear the search to see everything
                  again.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCategory("All");
                    setQuery("");
                  }}
                  className="mt-4 cursor-pointer rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-stone-800"
                >
                  Show all pieces
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visible.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}

/* ================================================================== */
/*  Product card                                                       */
/* ================================================================== */

function ProductCard({ product }: { product: SampleProduct }) {
  const Icon = ICONS[product.icon];
  const discount = product.compareAt
    ? Math.round((1 - product.price / product.compareAt) * 100)
    : null;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/85 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:bg-white hover:shadow-lg hover:shadow-rose-100/60 sm:rounded-3xl">
      {/* placeholder artwork — no images needed for the sample */}
      <div
        className={`relative flex h-40 items-center justify-center bg-gradient-to-br ${product.tone}`}
      >
        <Icon className="h-12 w-12 opacity-70 transition-transform duration-300 group-hover:scale-105" />

        {product.badge && (
          <span
            className={`absolute top-3 left-3 rounded-full border bg-white/90 px-2 py-0.5 text-[10px] font-semibold ${
              product.badge === "New"
                ? "border-emerald-200 text-emerald-700"
                : "border-rose-200 text-rose-600"
            }`}
          >
            {product.badge}
          </span>
        )}

        {discount !== null && (
          <span className="absolute top-3 right-3 rounded-full bg-stone-900/85 px-2 py-0.5 text-[10px] font-semibold text-white">
            {discount}% off
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[10px] font-semibold tracking-widest text-rose-500/80 uppercase">
          {product.category}
        </p>
        <h3 className="mt-1 text-sm font-semibold text-stone-900">
          {product.name}
        </h3>
        <p className="mt-1 flex-1 text-[11px] leading-relaxed text-stone-500">
          {product.blurb}
        </p>

        <div className="mt-2 flex items-center gap-1 text-[10px] text-stone-500">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span className="font-medium text-stone-700">{product.rating}</span>
          <span>· {product.reviews} reviews</span>
        </div>

        <div className="mt-3 flex items-end justify-between gap-2 border-t border-stone-100 pt-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold tabular-nums text-stone-900">
              {inr(product.price)}
            </p>
            {product.compareAt && (
              <p className="text-[10px] text-stone-400 line-through tabular-nums">
                {inr(product.compareAt)}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              toast("Sample catalogue — ordering isn't connected yet.")
            }
            className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-rose-200/70 bg-rose-50/60 px-2.5 py-1 text-[11px] font-semibold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50"
          >
            View
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </article>
  );
}

/* ================================================================== */
/*  Footer strip                                                       */
/* ================================================================== */

export function CollectionsFooterNote() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6">
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
  );
}
