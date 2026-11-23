"use client";

import Image from "next/image";

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import useEmblaCarousel from "embla-carousel-react";
import { X } from "lucide-react";

export type PhotoViewerImage = {
  id: string;
  url: string;
  altText?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  images: PhotoViewerImage[];
  index: number;
  onIndexChange: (index: number) => void;
  /** Shown in the top bar, usually the product or variant name. */
  title?: string;
};

/**
 * Full-screen photo viewer on a white canvas, driven by an Embla carousel:
 * swipe or drag to change photos (no arrow buttons), click a thumbnail to jump,
 * arrow keys and Esc on a keyboard. Rendered through a portal so fixed page
 * chrome cannot cover it. The `index` prop stays the single source of truth, so
 * closing returns to the photo the page was on.
 */
export default function PhotoViewer({
  open,
  onClose,
  images,
  index,
  onIndexChange,
  title,
}: Props) {
  const total = images.length;
  const safeIndex = total === 0 ? 0 : Math.min(Math.max(index, 0), total - 1);

  /* `duration` is Embla's snap transition in frames-ish units (default 25).
     A longer tween plus a lower drag threshold makes the full-screen swipe feel
     like a smooth glide instead of a hard snap. */
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: total > 1,
    startIndex: safeIndex,
    align: "start",
    duration: 45,
    dragThreshold: 6,
    skipSnaps: false,
    containScroll: false,
  });

  const scrollTo = useCallback(
    (target: number) => {
      if (emblaApi) emblaApi.scrollTo(target);
      onIndexChange(target);
    },
    [emblaApi, onIndexChange],
  );

  const step = useCallback(
    (delta: number) => {
      if (total < 2) return;
      if (emblaApi) {
        if (delta < 0) emblaApi.scrollPrev();
        else emblaApi.scrollNext();
        return;
      }
      onIndexChange((safeIndex + delta + total) % total);
    },
    [emblaApi, onIndexChange, safeIndex, total],
  );

  /* The page's index (a thumbnail, an external update) drives the carousel. */
  useEffect(() => {
    if (!emblaApi) return;
    const sync = () => {
      if (emblaApi.selectedScrollSnap() !== safeIndex) {
        emblaApi.scrollTo(safeIndex);
      }
    };
    sync();
  }, [emblaApi, safeIndex]);

  /* Dragging the carousel drives the page's index. */
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => onIndexChange(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onIndexChange]);

  /* Re-measure the loop whenever the photo set changes (e.g. new variant),
     landing on the photo the page asked for. The ref keeps this effect from
     re-running on every slide change. */
  const safeIndexRef = useRef(safeIndex);
  useEffect(() => {
    const remember = () => {
      safeIndexRef.current = safeIndex;
    };
    remember();
  }, [safeIndex]);

  useEffect(() => {
    if (!emblaApi) return;
    const remeasure = () => {
      emblaApi.reInit();
      emblaApi.scrollTo(safeIndexRef.current, true);
    };
    remeasure();
  }, [emblaApi, total]);

  useEffect(() => {
    if (!open || total === 0) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowLeft") step(-1);
      else if (event.key === "ArrowRight") step(1);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, total, onClose, step]);

  if (!open || total === 0 || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title ? `${title} photos` : "Photos"}
      className="fixed inset-0 z-90 flex flex-col bg-white"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-100 px-4 py-2.5">
        <p className="truncate text-xs font-semibold text-stone-700">
          {title ?? "Photos"}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-stone-600">
            {safeIndex + 1} / {total}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close full screen"
            className="cursor-pointer rounded-full p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 bg-white">
        {/* Swipe or drag to change photos — the arrows were removed on purpose. */}
        <div className="h-full cursor-grab overflow-hidden px-2 py-3 active:cursor-grabbing" ref={emblaRef}>
          <div className="flex h-full touch-pan-y select-none">
            {images.map((image) => (
              <div
                key={image.id}
                className="relative h-full min-w-0 shrink-0 grow-0 basis-full"
              >
                <Image
                  src={image.url}
                  alt={image.altText || title || "Photo"}
                  fill
                  draggable={false}
                  sizes="100vw"
                  className="object-contain"
                />
              </div>
            ))}
          </div>
        </div>


      </div>

      {total > 1 && (
        <div className="flex shrink-0 items-center justify-center gap-2 overflow-x-auto px-3 py-3">
          {images.map((image, i) => (
            <button
              key={image.id}
              type="button"
              onClick={() => scrollTo(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-pressed={i === safeIndex}
              className={`relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 transition-colors ${
                i === safeIndex
                  ? "border-rose-400"
                  : "border-transparent hover:border-rose-200"
              }`}
            >
              <Image
                src={image.url}
                alt={image.altText || title || "Photo"}
                fill
                sizes="48px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
