"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Flower2, Star, TrendingDown } from "lucide-react";

import type { CollectionProduct } from "../../../types/Collection.types";
import { formatCurrency } from "../../../utils/Formator/formatCurrency.util";

/* -------------------------------------------------------------------------- */
/*  Price label — single price or a range across variants                     */
/* -------------------------------------------------------------------------- */

export function productPriceLabel(product: CollectionProduct): string {
  if (product.priceFrom === null) return "Price on request";
  if (
    product.priceTo !== null &&
    product.priceTo > product.priceFrom
  ) {
    return `${formatCurrency(product.priceFrom)} – ${formatCurrency(
      product.priceTo,
    )}`;
  }
  return formatCurrency(product.priceFrom);
}

/* -------------------------------------------------------------------------- */
/*  Stars — combined across every variant of the base product                  */
/* -------------------------------------------------------------------------- */

export function ProductStars({
  average,
  count,
  className = "",
}: {
  average: number;
  count: number;
  className?: string;
}) {
  const rounded = Math.round(average);

  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      aria-label={
        count > 0
          ? `${average.toFixed(1)} out of 5 from ${count} reviews`
          : "No reviews yet"
      }
    >
      <span className="flex items-center gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((step) => (
          <Star
            key={step}
            className={`h-3 w-3 ${
              count > 0 && step <= rounded
                ? "fill-amber-400 text-amber-400"
                : "text-stone-300"
            }`}
          />
        ))}
      </span>
      <span className="text-[10px] font-medium text-stone-500">
        {count > 0 ? `${average.toFixed(1)} (${count})` : "No reviews"}
      </span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Product card — shared by /collections and the category pages              */
/* -------------------------------------------------------------------------- */

export default function CollectionCard({
  product,
}: {
  product: CollectionProduct;
}) {
  const comparePrice = product.compareAtPrice;
  const savings =
    comparePrice !== null &&
    product.priceFrom !== null &&
    comparePrice > product.priceFrom
      ? comparePrice - product.priceFrom
      : 0;
  const percentOff =
    savings > 0 && comparePrice !== null
      ? Math.round((savings / comparePrice) * 100)
      : 0;

  return (
    <Link
      href={product.href}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/85 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:bg-white hover:shadow-lg hover:shadow-rose-100/60 sm:rounded-3xl"
    >
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-linear-to-br from-rose-100 via-rose-50 to-amber-50">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <Flower2 className="h-12 w-12 text-rose-300" />
        )}

        {product.isFeatured && (
          <span className="absolute top-3 left-3 rounded-full border border-rose-200 bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
            Featured
          </span>
        )}

        {comparePrice !== null && savings > 0 && (
          <span className="absolute top-3 right-3 rounded-full bg-rose-500/95 px-2 py-0.5 text-[10px] leading-none font-bold tracking-wide text-white tabular-nums shadow-sm shadow-rose-900/20 ring-1 ring-white/50">
            -{percentOff}%
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[10px] font-semibold tracking-widest text-rose-500/80 uppercase">
          {product.subcategory
            ? `${product.category?.name ?? ""} · ${product.subcategory.name}`
            : (product.category?.name ?? "Uncategorised")}
        </p>
        <h3 className="mt-1 text-sm font-semibold text-stone-900">
          {product.name}
        </h3>

        <ProductStars
          average={product.reviews.average}
          count={product.reviews.count}
          className="mt-1.5"
        />

        <p className="mt-1 line-clamp-2 flex-1 text-[11px] leading-relaxed text-stone-500">
          {product.briefDescription ??
            "Handmade in small batches, made to order."}
        </p>

        <div className="mt-3 border-t border-stone-100 pt-3">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <p className="text-lg leading-none font-bold tracking-tight text-stone-900 tabular-nums">
                  {productPriceLabel(product)}
                </p>
                {comparePrice !== null && savings > 0 && (
                  <p className="text-[11px] leading-none font-medium text-stone-400 line-through tabular-nums">
                    {formatCurrency(comparePrice)}
                  </p>
                )}
              </div>

              {comparePrice !== null && savings > 0 && (
                <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                  <span className="inline-flex items-center rounded-full bg-linear-to-r from-rose-500 to-rose-600 px-1.5 py-0.5 text-[9px] leading-none font-bold tracking-wide text-white uppercase tabular-nums shadow-sm shadow-rose-500/25">
                    {percentOff}% off
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[10px] leading-none font-semibold text-emerald-700 tabular-nums">
                    <TrendingDown className="h-2.5 w-2.5" />
                    Save {formatCurrency(savings)}
                  </span>
                </div>
              )}
            </div>

            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-rose-200/70 bg-rose-50/60 px-2.5 py-1 text-[11px] font-semibold text-rose-600 transition-colors group-hover:border-rose-300 group-hover:bg-rose-50">
              View
              <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
