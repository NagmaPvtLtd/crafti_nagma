"use client";

import Link from "next/link";
import { ArrowRight, Flower2 } from "lucide-react";

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
/*  Product card — shared by /collections and the category pages              */
/* -------------------------------------------------------------------------- */

export default function CollectionCard({
  product,
}: {
  product: CollectionProduct;
}) {
  const soldOut = product.totalStock <= 0;

  return (
    <Link
      href={product.href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/85 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:bg-white hover:shadow-lg hover:shadow-rose-100/60 sm:rounded-3xl"
    >
      <div className="relative flex h-40 items-center justify-center overflow-hidden bg-linear-to-br from-rose-100 via-rose-50 to-amber-50">
        {product.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <Flower2 className="h-12 w-12 text-rose-300" />
        )}

        {product.isFeatured && (
          <span className="absolute top-3 left-3 rounded-full border border-rose-200 bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
            Featured
          </span>
        )}

        {soldOut && (
          <span className="absolute top-3 right-3 rounded-full bg-stone-900/85 px-2 py-0.5 text-[10px] font-semibold text-white">
            Sold out
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
        <p className="mt-1 line-clamp-2 flex-1 text-[11px] leading-relaxed text-stone-500">
          {product.briefDescription ??
            "Handmade in small batches, made to order."}
        </p>

        <div className="mt-3 flex items-end justify-between gap-2 border-t border-stone-100 pt-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold tabular-nums text-stone-900">
              {productPriceLabel(product)}
            </p>
          </div>

          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-rose-200/70 bg-rose-50/60 px-2.5 py-1 text-[11px] font-semibold text-rose-600 transition-colors group-hover:border-rose-300 group-hover:bg-rose-50">
            View
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}
