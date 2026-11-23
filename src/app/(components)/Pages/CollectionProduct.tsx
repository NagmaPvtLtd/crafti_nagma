"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import useEmblaCarousel from "embla-carousel-react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Heart,
  Maximize2,
  Flower2,
  Minus,
  Plus,
  Share2,
  ShoppingBag,
  Star,
} from "lucide-react";
import toast from "react-hot-toast";

import CustomLoader from "../CustomLoader";
import PhotoViewer from "../utils/PhotoViewer";
import PageWrapper from "../utils/PageWrapper";
import { SectionDivider } from "../utils/SectionDiv";
import { WhatsAppIcon } from "../utils/SocialIcons";
import { whatsappNumberLink } from "../../../utils/main.util";
import { formatCurrency } from "../../../utils/Formator/formatCurrency.util";
import type {
  CollectionOption,
  CollectionProductDetail,
  CollectionProductResponse,
  CollectionVariant,
  CollectionVariantRef,
} from "../../../types/Collection.types";

/* -------------------------------------------------------------------------- */
/*  Star row — Amazon-style rating under the title                            */
/* -------------------------------------------------------------------------- */

function ReviewStars({ average, count }: { average: number; count: number }) {
  const rounded = Math.round(average);

  return (
    <div className="mt-1.5 flex flex-wrap items-center justify-start gap-1.5">
      <div className="flex items-center gap-0.5 self-center" aria-hidden>
        {[1, 2, 3, 4, 5].map((step) => (
          <Star
            key={step}
            className={`h-3.5 w-3.5 ${
              count > 0 && step <= rounded
                ? "fill-amber-400 text-amber-400"
                : "text-stone-300"
            }`}
          />
        ))}
      </div>
      {count > 0 ? (
        <>
          <span className="text-xs font-semibold text-stone-700">
            {average.toFixed(1)}
          </span>
          <span className="text-[11px] text-stone-500">
            · {count} review{count === 1 ? "" : "s"}
          </span>
        </>
      ) : (
        <span className="flex items-center self-center text-[11px] leading-none text-stone-500">
          No reviews yet
        </span>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Small detail card used for features, care and gift contents               */
/* -------------------------------------------------------------------------- */

function SpecRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-stone-100 py-1.5">
      <dt className="text-stone-500">{label}</dt>
      <dd className="text-right font-semibold text-stone-800">{value}</dd>
    </div>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-rose-100 bg-white/85 p-5 backdrop-blur-sm sm:rounded-3xl">
      <h2 className="text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
        {title}
      </h2>
      <ul className="mt-2.5 space-y-2">
        {items.map((item, index) => (
          <li
            key={`${title}-${index}`}
            className="flex items-center gap-2 text-sm leading-snug text-stone-600"
          >
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Stock wording — urgency rises as the count drops                           */
/* -------------------------------------------------------------------------- */

/**
 * 15 or more  → "Only 20 left in stock!"
 * 5 – 14      → "Only a few left in stock!"
 * under 5     → "Low stock! Hurry up!"
 */
function stockLabel(stock: number | null): string {
  if (stock === null) return "In stock";
  if (stock < 5) return "Low stock! Hurry up!";
  if (stock < 10) return "Only a few left in stock!";
  return `Only ${stock} left in stock!`;
}

/* -------------------------------------------------------------------------- */
/*  Variant matching — works on the SKU skeleton, not the full variant        */
/* -------------------------------------------------------------------------- */

/** A variant fits a selection when it carries every value currently picked. */
function matchesSelection(
  variant: CollectionVariantRef,
  selection: Record<string, string>,
): boolean {
  return Object.values(selection).every((valueId) =>
    variant.optionValueIds.includes(valueId),
  );
}

function selectionForVariant(
  options: CollectionOption[],
  variant: CollectionVariant | null,
): Record<string, string> {
  if (!variant) return {};

  const next: Record<string, string> = {};
  for (const option of options) {
    const value = option.values.find((item) =>
      variant.optionValueIds.includes(item.id),
    );
    if (value) next[option.id] = value.id;
  }
  return next;
}

/* -------------------------------------------------------------------------- */
/*  /collections/[category]/[subcategory]/[product code]?variant=[sku]        */
/*  One variant per request: the URL's SKU picks what the server sends, so a  */
/*  shared link reopens exactly the variant it was copied from.               */
/* -------------------------------------------------------------------------- */

export default function CollectionProduct({ code }: { code: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedSku = searchParams.get("variant") ?? "";

  const [product, setProduct] = useState<CollectionProductDetail | null>(null);
  const [variant, setVariant] = useState<CollectionVariant | null>(null);
  const [variantRefs, setVariantRefs] = useState<CollectionVariantRef[]>([]);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [imageIndex, setImageIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [bulkNotice, setBulkNotice] = useState(false);

  /** `code|sku` already on screen — keeps the URL normalisation from refetching. */
  const loadedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const key = `${code}|${requestedSku}`;
    if (loadedKeyRef.current === key) return;

    let cancelled = false;

    async function load() {
      const sameProduct =
        loadedKeyRef.current !== null &&
        loadedKeyRef.current.split("|")[0] === code;

      if (sameProduct) {
        setSwitching(true);
      } else {
        setProduct(null);
        setVariant(null);
        setVariantRefs([]);
        setLoading(true);
      }
      setError(null);

      try {
        const res = await axios.get<CollectionProductResponse>(
          "/api/public/collections/product",
          {
            params: {
              code,
              ...(requestedSku ? { variant: requestedSku } : {}),
            },
          },
        );
        if (cancelled) return;

        const loaded = res.data;
        setProduct(loaded.product);
        setVariantRefs(loaded.variants);
        setVariant(loaded.variant);
        setSelection(
          selectionForVariant(loaded.product.options, loaded.variant),
        );
        setImageIndex(0);

        loadedKeyRef.current = loaded.variant
          ? `${code}|${loaded.variant.sku}`
          : key;

        /* Keep the address bar on the actual variant, so copy-link shares it. */
        if (loaded.variant && loaded.variant.sku !== requestedSku) {
          router.replace(
            `${pathname}?variant=${encodeURIComponent(loaded.variant.sku)}`,
            { scroll: false },
          );
        }
      } catch (err) {
        if (cancelled) return;
        loadedKeyRef.current = null;
        const status = axios.isAxiosError(err) ? err.response?.status : null;
        setError(
          status === 404
            ? "This product does not exist or is no longer available."
            : "Could not load this product right now.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
          setSwitching(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [code, requestedSku, pathname, router]);

  const options = product?.options ?? [];

  const selectedValueLabels = options
    .map(
      (option) =>
        option.values.find((value) => value.id === selection[option.id])?.value,
    )
    .filter((value): value is string => Boolean(value));

  const gallery = useMemo(() => {
    if (!product) return [];
    if (variant && variant.images.length > 0) return variant.images;
    return product.images;
  }, [product, variant]);

  /* Main slider + its thumbnail strip, both Embla. Dragging the main slider
     updates the active thumbnail; tapping a thumbnail scrolls the main one. */
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: gallery.length > 1,
    align: "start",
  });
  const [thumbsRef, thumbsApi] = useEmblaCarousel({
    containScroll: "keepSnaps",
    dragFree: true,
    align: "start",
  });

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      const next = emblaApi.selectedScrollSnap();
      setImageIndex(next);
      thumbsApi?.scrollTo(next);
    };

    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, thumbsApi]);

  /* The gallery is replaced when the variant changes, so re-measure and go
     back to the first photo. */
  useEffect(() => {
    const reset = () => {
      emblaApi?.reInit();
      thumbsApi?.reInit();
      emblaApi?.scrollTo(0, true);
    };
    reset();
  }, [gallery, emblaApi, thumbsApi]);

  const activeImage = gallery[imageIndex] ?? gallery[0] ?? null;

  const price = variant?.price ?? null;
  const compareAt = variant?.compareAtPrice ?? null;
  const stock = variant?.stock ?? null;
  const soldOut = stock !== null && stock <= 0;

  const description =
    variant?.description?.trim() || product?.description || null;
  const brief =
    variant?.briefDescription?.trim() || product?.briefDescription || null;

  /** A variant may carry its own features / care instructions. */
  const features =
    variant && variant.features.length > 0
      ? variant.features
      : (product?.features ?? []);
  const careInstructions =
    variant && variant.careInstructions.length > 0
      ? variant.careInstructions
      : (product?.careInstructions ?? []);
  /* Only the selected variant's own snapshot is shown. No fallback to the
     base product — when the variant has no measurements the label is hidden. */
  const dimensions = variant?.dimensions ?? null;

  const dimensionLabel = dimensions
    ? [
        dimensions.length !== null ? `L ${dimensions.length}` : null,
        dimensions.width !== null ? `W ${dimensions.width}` : null,
        dimensions.height !== null ? `H ${dimensions.height}` : null,
      ]
        .filter((part): part is string => Boolean(part))
        .join(" × ")
    : "";

  const dimensionUnit = dimensions?.dimensionUnit ?? "";

  /**
   * Uses the device's own share sheet (Android / iOS / supported desktop
   * browsers) for the current product + variant link, and falls back to copying
   * the link when the browser has no Web Share support.
   */
  async function shareProduct() {
    if (!product) return;

    const url = window.location.href;
    const shareData = {
      title: product.name,
      text: product.briefDescription ?? undefined,
      url,
    };

    try {
      if (typeof navigator.share === "function") {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(url);
      toast.success("Link copied — share it anywhere");
    } catch (err) {
      /* Closing the native share sheet is not an error. */
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error("Could not share this link");
    }
  }

  /** Values that would leave no active variant behind are greyed out. */
  function isValueAvailable(optionId: string, valueId: string): boolean {
    if (!product) return false;
    if (selection[optionId] === valueId) return true;

    const next = { ...selection, [optionId]: valueId };
    return variantRefs.some(
      (item) => item.status === "active" && matchesSelection(item, next),
    );
  }

  /**
   * Picking a value resolves the matching variant's SKU and puts it in the
   * URL; the effect above then asks the backend for that variant's data.
   */
  function chooseValue(optionId: string, valueId: string) {
    if (!product || switching) return;

    const next = { ...selection, [optionId]: valueId };
    const candidates = variantRefs.filter(
      (item) => item.status === "active" && matchesSelection(item, next),
    );
    if (candidates.length === 0) return;

    /* Prefer the variant that fills every option, then the first match. */
    const chosen =
      candidates.find((item) =>
        product.options.every(
          (option) =>
            !next[option.id] || item.optionValueIds.includes(next[option.id]),
        ),
      ) ?? candidates[0];

    setSelection(next);
    setImageIndex(0);

    if (chosen.id === variant?.id) return;

    setSwitching(true);
    router.replace(`${pathname}?variant=${encodeURIComponent(chosen.sku)}`, {
      scroll: false,
    });
  }

  const discount =
    compareAt !== null && price !== null && compareAt > price
      ? Math.round((1 - price / compareAt) * 100)
      : null;

  const displayName = variant?.name?.trim() || product?.name || code;

  const whatsappMessage = `Hello, crafti nagma. I am interest in this product of yours!

Product Name: ${displayName}
Product ID: ${variant?.sku ?? product?.code ?? code}`;

  const whatsappUrl = `${whatsappNumberLink}?text=${encodeURIComponent(
    whatsappMessage,
  )}`;

  /** Quantity is capped at 99; past that the shopper sees a bulk-order note. */
  function changeQuantity(delta: -1 | 1) {
    setQuantity((current) => {
      const next = current + delta;
      if (next > 99) {
        setBulkNotice(true);
        return 99;
      }
      if (next < 1) return 1;
      if (next < 99) setBulkNotice(false);
      return next;
    });
  }

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
          {product?.category && (
            <>
              <ChevronRight className="h-3 w-3 text-stone-300" />
              <Link
                href={`/collections/${product.category.slug}`}
                className="hover:text-rose-600"
              >
                {product.category.name}
              </Link>
            </>
          )}
          {product?.subcategory && (
            <>
              <ChevronRight className="h-3 w-3 text-stone-300" />
              <Link
                href={`/collections/${product.category?.slug ?? "all"}/${product.subcategory.slug}`}
                className="hover:text-rose-600"
              >
                {product.subcategory.name}
              </Link>
            </>
          )}
          <ChevronRight className="h-3 w-3 text-stone-300" />
          <span className="font-semibold text-stone-700">{displayName}</span>
        </nav>
        <SectionDivider className="my-6" size={11} />

        {loading ? (
          <CustomLoader fullScreen={false} label="Loading the product…" />
        ) : error || !product ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-rose-200 bg-white/70 px-6 py-14 text-center backdrop-blur-sm sm:rounded-3xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-500">
              <AlertCircle className="h-5 w-5" />
            </div>
            <h1 className="mt-3 text-base font-semibold text-stone-900">
              Product unavailable
            </h1>
            <p className="mt-1 max-w-sm text-sm text-stone-600">{error}</p>
            <Link
              href="/collections"
              className="mt-4 inline-flex items-center gap-1 rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-stone-800"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to collections
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* ---------------- Gallery — selected variant's photos ---------------- */}
              <div>
                <div className="relative overflow-hidden rounded-2xl border border-rose-100 bg-linear-to-br from-rose-100 via-rose-50 to-amber-50 sm:rounded-3xl">
                  {gallery.length === 0 ? (
                    <div className="flex aspect-4/3 items-center justify-center">
                      <Flower2 className="h-14 w-14 text-rose-300" />
                    </div>
                  ) : (
                    <div className="overflow-hidden" ref={emblaRef}>
                      <div className="flex touch-pan-y select-none">
                        {gallery.map((image, index) => (
                          <div
                            key={image.id}
                            className="relative aspect-4/3 min-w-0 shrink-0 grow-0 basis-full"
                          >
                            <button
                              type="button"
                              onClick={() => setViewerOpen(true)}
                              aria-label={`View photo ${index + 1} full screen`}
                              className="absolute inset-0 cursor-zoom-in"
                            >
                              <Image
                                src={image.url}
                                alt={image.altText ?? product.name}
                                fill
                                sizes="(max-width: 1024px) 100vw, 50vw"
                                className="object-cover"
                                draggable={false}
                                priority={index === 0}
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeImage && (
                    <button
                      type="button"
                      onClick={() => setViewerOpen(true)}
                      aria-label="View photo full screen"
                      className="absolute top-3 right-3 z-10 cursor-pointer rounded-full bg-white/90 p-1.5 text-stone-700 shadow-md ring-1 ring-stone-200/60 transition-colors hover:bg-white"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {gallery.length > 1 && (
                    <>
                      <button
                        type="button"
                        aria-label="Previous image"
                        onClick={() => emblaApi?.scrollPrev()}
                        className="absolute top-1/2 left-2 z-10 -translate-y-1/2 cursor-pointer rounded-full bg-white/90 p-1.5 text-stone-700 shadow-md transition-colors hover:bg-white"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Next image"
                        onClick={() => emblaApi?.scrollNext()}
                        className="absolute top-1/2 right-2 z-10 -translate-y-1/2 cursor-pointer rounded-full bg-white/90 p-1.5 text-stone-700 shadow-md transition-colors hover:bg-white"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <span className="absolute right-2 bottom-2 z-10 rounded-full bg-stone-900/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                        {imageIndex + 1} / {gallery.length}
                      </span>
                    </>
                  )}
                </div>

                {gallery.length > 1 && (
                  <div className="mt-2 overflow-hidden" ref={thumbsRef}>
                    <div className="flex touch-pan-y gap-2 pb-1">
                      {gallery.map((image, index) => (
                        <button
                          key={image.id}
                          type="button"
                          onClick={() => {
                            emblaApi?.scrollTo(index);
                            thumbsApi?.scrollTo(index);
                          }}
                          aria-label={`Show photo ${index + 1}`}
                          aria-pressed={index === imageIndex}
                          className={`relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 transition-colors ${
                            index === imageIndex
                              ? "border-rose-400"
                              : "border-transparent hover:border-rose-200"
                          }`}
                        >
                          <Image
                            src={image.url}
                            alt={image.altText ?? product.name}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ---------------- Details ---------------- */}
              <div
                aria-busy={switching}
                className={`rounded-2xl border border-rose-100 bg-white/85 p-5 backdrop-blur-sm transition-opacity sm:rounded-3xl ${
                  switching ? "opacity-70" : ""
                }`}
              >
                <div className="mt-2 flex items-start justify-between gap-3">
                  <h1 className="min-w-0 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
                    {displayName}
                  </h1>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void shareProduct()}
                      aria-label="Share this product"
                      title="Share this product"
                      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 transition-colors hover:border-rose-200 hover:bg-rose-50/60 hover:text-rose-600"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toast("Wishlist feature coming soon")}
                      aria-label="Add to wishlist"
                      title="Add to wishlist"
                      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 transition-colors hover:border-rose-200 hover:bg-rose-50/60 hover:text-rose-600"
                    >
                      <Heart className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <ReviewStars
                  average={product.reviews.average}
                  count={product.reviews.count}
                />

                {product.isFeatured && (
                  <span className="mt-2 inline-block rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                    Featured
                  </span>
                )}

                {brief && (
                  <p className="mt-3 text-sm leading-relaxed text-stone-600">
                    {brief}
                  </p>
                )}

                {/* Price */}
                <div className="mt-4 flex flex-wrap items-end gap-2">
                  <p className="text-3xl font-semibold tabular-nums text-emerald-700">
                    {price === null
                      ? "Price on request"
                      : formatCurrency(price)}
                  </p>
                  {compareAt !== null && compareAt > (price ?? 0) && (
                    <p className="text-sm text-stone-400 line-through tabular-nums">
                      {formatCurrency(compareAt)}
                    </p>
                  )}
                  {discount !== null && (
                    <span className="text-[11px] font-semibold text-emerald-600">
                      Save {discount}%
                    </span>
                  )}
                </div>

                {/* Availability */}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                  <span
                    className={`rounded-full px-2 py-0.5 font-semibold ${
                      variant && !soldOut && variant.status === "active"
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border border-stone-200 bg-stone-100 text-stone-500"
                    }`}
                  >
                    {!variant
                      ? "Currently unavailable"
                      : variant.status === "inactive"
                        ? "Currently unavailable"
                        : soldOut
                          ? "Out of stock"
                          : stockLabel(stock)}
                  </span>
                  {variant?.isFeatured && (
                    <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 font-semibold text-rose-600">
                      Bestseller
                    </span>
                  )}
                </div>

                {/* Options — pick values, the chosen variant is fetched by SKU */}
                {options.length > 0 && (
                  <div className="mt-4 space-y-3 border-t border-stone-100 pt-4">
                    {options.map((option) => {
                      const selectedValueId = selection[option.id];

                      return (
                        <div key={option.id}>
                          <p className="text-[11px] text-stone-500">
                            <span className="font-semibold tracking-wide text-stone-700 capitalize">
                              Choose {option.name}:
                            </span>
                          </p>

                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {option.values.map((value) => {
                              const active = value.id === selectedValueId;
                              const available = isValueAvailable(
                                option.id,
                                value.id,
                              );

                              return (
                                <button
                                  key={value.id}
                                  type="button"
                                  onClick={() =>
                                    chooseValue(option.id, value.id)
                                  }
                                  disabled={!available || switching}
                                  aria-pressed={active}
                                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
                                    active
                                      ? "border-rose-200 bg-rose-50 text-rose-600 "
                                      : available
                                        ? "cursor-pointer border-stone-200 bg-white text-stone-600 hover:border-rose-100 hover:text-stone-900"
                                        : "cursor-not-allowed border-stone-100 bg-stone-50 text-stone-300 line-through"
                                  }`}
                                >
                                  {value.value}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-4 border-t border-stone-100 pt-4">
                  <div className="flex items-stretch gap-2">
                    <div className="inline-flex shrink-0 items-center rounded-xl border border-stone-200 bg-white">
                      <button
                        type="button"
                        onClick={() => changeQuantity(-1)}
                        disabled={quantity <= 1}
                        aria-label="Decrease quantity"
                        className="inline-flex h-10 w-9 cursor-pointer items-center justify-center rounded-l-xl text-stone-600 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="inline-flex h-10 w-9 items-center justify-center border-x border-stone-100 text-sm font-semibold tabular-nums text-stone-900">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => changeQuantity(1)}
                        aria-label="Increase quantity"
                        className="inline-flex h-10 w-9 cursor-pointer items-center justify-center rounded-r-xl text-stone-600 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => toast("Add to Cart is coming soon")}
                      className="inline-flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-rose-500 px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-rose-500/25 transition-colors hover:bg-rose-600"
                    >
                      <ShoppingBag className="h-4 w-4 shrink-0" />
                      <span className="truncate">Add to Cart</span>
                    </button>

                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Ask about this product on WhatsApp"
                      title="Ask about this product on WhatsApp"
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center self-stretch rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 transition-colors hover:border-emerald-300 hover:bg-emerald-100"
                    >
                      <WhatsAppIcon className="h-4 w-4" />
                    </a>
                  </div>

                  {bulkNotice && (
                    <p className="mt-2 flex items-start gap-1.5 rounded-xl border border-amber-200/70 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
                      <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                      Bulk orders above 99 pieces are subject to terms and
                      conditions and take longer to deliver.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {(description || variant) && (
              <>
                <SectionDivider className="mx-auto max-w-7xl py-8" />
                <div className="rounded-2xl border border-rose-100 bg-white/85 p-5 backdrop-blur-sm sm:rounded-3xl">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
                      Product Description
                    </h2>
                    {variant?.description?.trim() &&
                      selectedValueLabels.length > 0 && (
                        <span className="text-[11px] font-medium text-stone-500">
                          {selectedValueLabels.join(" / ")}
                        </span>
                      )}
                  </div>
                  {description && (
                    <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-stone-600">
                      {description}
                    </p>
                  )}

                  {/* Quiet identifier for people who come looking for it. */}
                  {variant && (
                    <p className="mt-4 border-t border-stone-100 pt-3 text-[10px] text-stone-400">
                      Product ID:{" "}
                      <span className="font-medium text-stone-500">
                        {variant.sku}
                      </span>
                    </p>
                  )}
                </div>
              </>
            )}

            {/* ---------------- Features / care / gift / specs ---------------- */}
            {(features.length > 0 ||
              careInstructions.length > 0 ||
              product.giftIncluded.length > 0) && (
              <>
                <SectionDivider className="mx-auto max-w-7xl py-8" />
                <div className="space-y-3">
                  <DetailList
                    title="Product Features"
                    items={features.map((feature) => feature.text)}
                  />
                  <DetailList
                    title="Product Care Instructions"
                    items={careInstructions.map((care) => care.text)}
                  />
                  <DetailList
                    title="Gift Includes"
                    items={product.giftIncluded.map((gift) => gift.text)}
                  />
                </div>
              </>
            )}

            {/* ---------------- Specifications ---------------- */}
            <div className="mt-3 rounded-2xl border border-rose-100 bg-white/85 p-5 backdrop-blur-sm sm:rounded-3xl">
              <h2 className="text-lg font-semibold tracking-tight text-stone-900 sm:text-xl">
                Specifications
              </h2>

              <dl className="mt-2.5 grid grid-cols-1 gap-x-6 gap-y-1.5 text-[12px] sm:grid-cols-2">
                {options.length > 0 && (
                  <SpecRow
                    label={options.map((option) => option.name).join(" / ")}
                    value={selectedValueLabels.join(" / ") || "—"}
                  />
                )}
                <SpecRow
                  label="Category"
                  value={product.category?.name ?? "—"}
                />
                <SpecRow
                  label="Subcategory"
                  value={product.subcategory?.name ?? "—"}
                />
                <SpecRow
                  label="Weight"
                  value={
                    variant?.weight !== null && variant?.weight !== undefined
                      ? `${variant.weight} g`
                      : "—"
                  }
                />
                {dimensionLabel && (
                  <SpecRow
                    label="Dimensions (L × W × H)"
                    value={`${dimensionLabel} ${dimensionUnit}`.trim()}
                  />
                )}
                <SpecRow
                  label="Processing time"
                  value={product.processingTime ?? "—"}
                />
              </dl>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* TODO(reviews): replace this placeholder with the real reviews      */}
            {/* module — paginated approved reviews from `product_reviews`, a      */}
            {/* rating breakdown, helpful votes and a submit form. The summary     */}
            {/* above already comes from the live review average.                  */}
            {/* ---------------------------------------------------------------- */}
            <SectionDivider className="mx-auto max-w-7xl py-8" />

            <section
              id="reviews"
              className="rounded-2xl border border-dashed border-rose-200 bg-white/70 p-5 backdrop-blur-sm sm:rounded-3xl"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold tracking-widest text-rose-500/80 uppercase">
                    Product Reviews
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-stone-900">
                    What people are saying
                  </h2>
                </div>

                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700 uppercase">
                  Reviews Coming Soon
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <ReviewStars
                  average={product.reviews.average}
                  count={product.reviews.count}
                />
                <p className="text-[11px] text-stone-500">
                  The review list, rating breakdown and review form will land
                  here.
                </p>
              </div>
            </section>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-rose-100 bg-white/80 px-4 py-3 text-[11px] text-stone-500 backdrop-blur-sm">
              <Link
                href={
                  product.category
                    ? `/collections/${product.category.slug}`
                    : "/collections"
                }
                className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:text-rose-700"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to {product.category?.name ?? "collections"}
              </Link>
              <Link
                href="/collections"
                className="font-semibold text-stone-600 hover:text-stone-900"
              >
                All collections
              </Link>
            </div>
          </>
        )}

        <PhotoViewer
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
          images={gallery}
          index={imageIndex}
          onIndexChange={(next) => {
            setImageIndex(next);
            emblaApi?.scrollTo(next);
          }}
          title={product?.name}
        />
      </div>
    </PageWrapper>
  );
}
