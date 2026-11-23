"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
import {
  AlertCircle,
  ArrowRight,
  Flower2,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import CustomLoader from "../CustomLoader";
import ErrorState from "../utils/ErrorState";
import PageWrapper from "../utils/PageWrapper";
import { SectionDivider, SectionEyebrow } from "../utils/SectionDiv";
import getApiErrorMessage from "../../../utils/Auth/Auth.axiosErrorHelper.util";
import { formatCurrency } from "../../../utils/Formator/formatCurrency.util";
import type { CartItemView, CartResponse } from "../../../types/Cart.types";

const MAX_QUANTITY = 99;

/* -------------------------------------------------------------------------- */
/*  /cart — login-first, so the proxy guarantees a signed-in user here        */
/* -------------------------------------------------------------------------- */

export default function CartClient() {
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyVariantId, setBusyVariantId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await axios.get<CartResponse>("/api/user/cart");
      setCart(res.data);
      setError(null);
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Could not load your cart right now."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCart() {
      try {
        const res = await axios.get<CartResponse>("/api/user/cart");
        if (cancelled) return;
        setCart(res.data);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(
            getApiErrorMessage(err, "Could not load your cart right now."),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCart();
    return () => {
      cancelled = true;
    };
  }, []);

  function retry() {
    setLoading(true);
    setError(null);
    void load();
  }

  /** Every mutation returns the whole cart, so one setter keeps it in sync. */
  async function mutate(
    variantId: string,
    work: () => Promise<CartResponse>,
    fallback: string,
  ): Promise<void> {
    setBusyVariantId(variantId);

    try {
      const next = await work();
      setCart(next);
      window.dispatchEvent(new CustomEvent("cart:updated"));
    } catch (err) {
      toast.error(getApiErrorMessage(err, fallback));
    } finally {
      setBusyVariantId(null);
    }
  }

  async function updateQuantity(item: CartItemView, quantity: number) {
    const ceiling = Math.max(1, Math.min(MAX_QUANTITY, item.stock));
    const next = Math.min(Math.max(quantity, 1), ceiling);
    if (next === item.quantity) return;

    await mutate(
      item.variantId,
      async () => {
        const res = await axios.patch<CartResponse>(
          `/api/user/cart/items/${encodeURIComponent(item.variantId)}`,
          { quantity: next },
        );
        return res.data;
      },
      "Could not update this item",
    );
  }

  async function removeItem(item: CartItemView) {
    await mutate(
      item.variantId,
      async () => {
        const res = await axios.delete<CartResponse>(
          `/api/user/cart/items/${encodeURIComponent(item.variantId)}`,
        );
        return res.data;
      },
      "Could not remove this item",
    );
  }

  async function clearCart() {
    setClearing(true);

    try {
      const res = await axios.delete<CartResponse>("/api/user/cart");
      setCart(res.data);
      window.dispatchEvent(new CustomEvent("cart:updated"));
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not clear your cart"));
    } finally {
      setClearing(false);
    }
  }

  const items = cart?.items ?? [];
  const summary = cart?.summary ?? { itemCount: 0, quantity: 0, subtotal: 0 };

  return (
    <PageWrapper variant="form">
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-12 sm:px-6 sm:pt-10 sm:pb-16">
        <div className="min-w-0">
          <SectionEyebrow>Cart</SectionEyebrow>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
            Your cart
          </h1>
        </div>

        <SectionDivider className="my-6" size={11} />

        {loading ? (
          <CustomLoader fullScreen={false} label="Loading your cart…" />
        ) : error ? (
          <ErrorState
            title="Cart unavailable"
            message={error}
            onRetry={retry}
          />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-rose-200 bg-white/70 px-6 py-14 text-center backdrop-blur-sm sm:rounded-3xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-500">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <h2 className="mt-3 text-base font-semibold text-stone-900">
              Your cart is empty
            </h2>
            <p className="mt-1 max-w-sm text-sm text-stone-600">
              Handmade treasures are waiting — browse the collections and add
              something you love.
            </p>
            <Link
              href="/collections"
              className="mt-4 inline-flex items-center gap-1 rounded-full bg-rose-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-600"
            >
              Browse collections
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-rose-100 bg-white/85 backdrop-blur-sm sm:rounded-3xl">
              {items.map((item) => (
                <CartRow
                  key={item.variantId}
                  item={item}
                  busy={busyVariantId === item.variantId}
                  onQuantity={(quantity) => void updateQuantity(item, quantity)}
                  onRemove={() => void removeItem(item)}
                />
              ))}
            </ul>

            <aside className="rounded-2xl border border-rose-100 bg-white/90 p-5 backdrop-blur-sm sm:rounded-3xl lg:sticky lg:top-20">
              <h2 className="text-lg font-semibold tracking-tight text-stone-900">
                Order summary
              </h2>

              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-stone-500">Items</dt>
                  <dd className="font-semibold tabular-nums text-stone-900">
                    {summary.itemCount}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-stone-500">Quantity</dt>
                  <dd className="font-semibold tabular-nums text-stone-900">
                    {summary.quantity}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-stone-100 pt-2.5">
                  <dt className="font-semibold text-stone-700">Subtotal</dt>
                  <dd className="text-lg font-semibold tabular-nums text-emerald-700">
                    {formatCurrency(summary.subtotal)}
                  </dd>
                </div>
              </dl>

              <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
                Only available lines are counted. Checkout is coming soon — your
                cart is saved to your account.
              </p>

              <Link
                href="/collections"
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-rose-500 px-3 py-2.5 text-sm font-semibold text-white shadow-sm shadow-rose-500/25 transition-colors hover:bg-rose-600"
              >
                Continue shopping
                <ArrowRight className="h-4 w-4" />
              </Link>

              <button
                type="button"
                onClick={() => void clearCart()}
                disabled={clearing}
                className="mt-2 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-600 transition-colors hover:border-rose-200 hover:bg-rose-50/60 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {clearing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Clear cart
              </button>
            </aside>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

/* -------------------------------------------------------------------------- */
/*  One cart line                                                             */
/* -------------------------------------------------------------------------- */

function CartRow({
  item,
  busy,
  onQuantity,
  onRemove,
}: {
  item: CartItemView;
  busy: boolean;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  const compareAt = item.compareAtPrice;
  const discount =
    compareAt !== null && compareAt > item.price
      ? Math.round((1 - item.price / compareAt) * 100)
      : null;
  const ceiling = Math.max(1, Math.min(MAX_QUANTITY, item.stock));
  const reason = item.available
    ? null
    : item.status === "inactive"
      ? "No longer available"
      : "Out of stock";

  return (
    <li
      className={`flex gap-3 p-3.5 sm:gap-4 sm:p-4 ${
        item.available ? "" : "opacity-60"
      }`}
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-stone-100 bg-linear-to-br from-rose-50 via-white to-amber-50 sm:h-24 sm:w-24">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Flower2 className="h-7 w-7 text-rose-300" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm leading-snug font-semibold wrap-break-word text-stone-900">
              {item.name}
            </p>
            {item.name !== item.productName && (
              <p className="text-[11px] wrap-break-word text-stone-500">
                {item.productName}
              </p>
            )}
            <p className="mt-0.5 text-[10px] text-stone-400">
              SKU:{" "}
              <span className="font-medium text-stone-500">{item.sku}</span>
              <span className="text-stone-300"> · </span>
              {item.productCode}
            </p>

            {reason && (
              <p className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-600">
                <AlertCircle className="h-3 w-3" />
                {reason} — not counted in your subtotal
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onRemove}
            disabled={busy}
            aria-label={`Remove ${item.name} from your cart`}
            title="Remove"
            className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 transition-colors hover:border-rose-200 hover:bg-rose-50/60 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-sm font-semibold tabular-nums text-stone-900">
              {formatCurrency(item.price)}
            </p>
            {compareAt !== null && discount !== null && (
              <p className="text-[11px] text-stone-400">
                <span className="line-through tabular-nums">
                  {formatCurrency(compareAt)}
                </span>{" "}
                <span className="font-semibold text-emerald-600">
                  Save {discount}%
                </span>
              </p>
            )}
          </div>

          <div className="inline-flex items-center rounded-xl border border-stone-200 bg-white">
            <button
              type="button"
              onClick={() => onQuantity(item.quantity - 1)}
              disabled={busy || !item.available || item.quantity <= 1}
              aria-label="Decrease quantity"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-l-xl text-stone-600 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="inline-flex h-8 w-8 items-center justify-center border-x border-stone-100 text-xs font-semibold tabular-nums text-stone-900">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => onQuantity(item.quantity + 1)}
              disabled={busy || !item.available || item.quantity >= ceiling}
              aria-label="Increase quantity"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-r-xl text-stone-600 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <div className="text-right">
            <p className="text-[10px] text-stone-400">Line total</p>
            <p
              className={`text-sm font-semibold tabular-nums ${
                item.available
                  ? "text-stone-900"
                  : "text-stone-400 line-through"
              }`}
            >
              {formatCurrency(item.lineTotal)}
            </p>
          </div>
        </div>
      </div>
    </li>
  );
}
