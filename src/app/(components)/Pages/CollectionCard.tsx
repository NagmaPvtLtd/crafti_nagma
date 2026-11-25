"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Flower2,
  Heart,
  Loader2,
  ShoppingBag,
  Star,
  TrendingDown,
} from "lucide-react";
import toast from "react-hot-toast";

import type {
  CollectionProduct,
  CollectionProductResponse,
} from "../../../types/Collection.types";
import { formatCurrency } from "../../../utils/Formator/formatCurrency.util";
import getApiErrorMessage from "../../../utils/Auth/Auth.axiosErrorHelper.util";

/* -------------------------------------------------------------------------- */
/*  Price label — single price or a range across variants                     */
/* -------------------------------------------------------------------------- */

export function productPriceLabel(product: CollectionProduct): string {
  if (product.priceFrom === null) return "Price on request";
  if (product.priceTo !== null && product.priceTo > product.priceFrom) {
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
/*  Product card — shared by /collections, search, and category pages         */
/*  Layout: badge + heart over the photo, then title, copy, rating, and a      */
/*  price / Add to Cart footer. The whole card still opens the product.       */
/* -------------------------------------------------------------------------- */

const LOGIN_PATH = "/login";

export default function CollectionCard({
  product,
}: {
  product: CollectionProduct;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [hearting, setHearting] = useState(false);

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

  function goToLogin(callbackUrl: string) {
    router.push(`${LOGIN_PATH}?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  /**
   * Guests are sent to the login page (Google sign-in lives there) and come
   * back to the same list. Signed-in shoppers get the placeholder for now —
   * wishlists have no backend yet.
   */
  async function handleHeart() {
    if (hearting) return;
    setHearting(true);

    try {
      await axios.get("/api/auth/profile");
      toast("Wishlist is coming soon");
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : null;

      if (status === 401) {
        const back = `${window.location.pathname}${window.location.search}`;
        goToLogin(back);
        return;
      }

      /* Any other answer means a signed-in session that is not a customer. */
      toast("Wishlist is coming soon");
    } finally {
      setHearting(false);
    }
  }

  /**
   * Adds the product's first available variant. A guest's 401 is turned into
   * the product page's `addCart` round-trip, so the item is added right after
   * they sign in with Google.
   */
  async function handleAddToCart() {
    if (adding) return;
    setAdding(true);

    try {
      const res = await axios.get<CollectionProductResponse>(
        "/api/public/collections/product",
        { params: { code: product.code } },
      );

      const variant = res.data.variant;
      if (!variant || variant.status !== "active" || variant.stock <= 0) {
        toast.error("This item is not available right now");
        return;
      }

      try {
        await axios.post("/api/user/cart/items", {
          variantId: variant.id,
          quantity: 1,
        });
        window.dispatchEvent(new CustomEvent("cart:updated"));
        toast.success("Added to cart");
      } catch (err) {
        const status = axios.isAxiosError(err) ? err.response?.status : null;

        if (status === 401) {
          const params = new URLSearchParams({
            variant: variant.sku,
            addCart: variant.id,
            qty: "1",
          });
          goToLogin(`${product.href}?${params.toString()}`);
          return;
        }

        throw err;
      }
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, "Could not add this item to your cart"),
      );
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="group relative flex h-full flex-col rounded-(--card-radius) border border-rose-100 bg-white transition-all duration-300 [--card-radius:1rem] hover:scale-[1.02] hover:border-rose-200 hover:shadow-lg hover:shadow-rose-100/60 sm:[--card-radius:1.5rem]">
      {/* Card-wide link sits under the two buttons. */}
      <Link
        href={product.href}
        aria-label={`View ${product.name}`}
        className="absolute inset-0 z-10"
      />

      <div className="relative overflow-hidden rounded-t-(--card-radius) bg-linear-to-b from-rose-100 via-rose-50 to-white">
        <div className="relative aspect-square w-full">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              loading={"eager"}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="card-photo object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Flower2 className="h-12 w-12 text-rose-300" />
            </div>
          )}
        </div>

        {product.isFeatured && (
          <span className="absolute top-3 left-3 z-20 rounded-md bg-white/95 px-2 py-1 text-[9px] leading-none font-bold tracking-[0.14em] text-rose-600 uppercase shadow-sm ring-1 ring-rose-100">
            Best seller
          </span>
        )}

        <button
          type="button"
          onClick={() => void handleHeart()}
          disabled={hearting}
          aria-label={`Add ${product.name} to your wishlist`}
          title="Add to wishlist"
          className="absolute top-2.5 right-2.5 z-20 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/90 text-stone-500 shadow-sm ring-1 ring-stone-200/70 transition-colors hover:text-rose-600 hover:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {hearting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Heart className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-base leading-snug font-semibold tracking-tight text-stone-900 sm:text-lg">
          {product.name}
        </h3>

        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-stone-500 sm:text-xs">
          {product.briefDescription ??
            "Handmade in small batches, made to order."}
        </p>

        <span
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-stone-500"
          aria-label={
            product.reviews.count > 0
              ? `${product.reviews.average.toFixed(1)} out of 5 from ${
                  product.reviews.count
                } reviews`
              : "No reviews yet"
          }
        >
          <Star
            className="mb-0.5 h-3 w-3 fill-amber-400 text-amber-400"
            aria-hidden
          />
          {product.reviews.count > 0
            ? `${product.reviews.average.toFixed(1)} (${product.reviews.count})`
            : "No reviews yet"}
        </span>

        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <div className="min-w-0">
            <p className="text-lg leading-none font-bold tracking-tight text-stone-900 tabular-nums">
              {productPriceLabel(product)}
            </p>

            {comparePrice !== null && savings > 0 && (
              <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                <span className="text-[11px] leading-none font-medium text-stone-400 line-through tabular-nums">
                  {formatCurrency(comparePrice)}
                </span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-1.5 py-0.5 text-[9px] leading-none font-bold text-rose-600 tabular-nums">
                  <TrendingDown className="h-2.5 w-2.5" aria-hidden />
                  {percentOff}% off
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => void handleAddToCart()}
            disabled={adding}
            className="relative z-20 inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-rose-500 px-3 py-2 text-[11px] font-semibold text-white shadow-sm shadow-rose-500/25 transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {adding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ShoppingBag className="h-3.5 w-3.5" />
            )}
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
