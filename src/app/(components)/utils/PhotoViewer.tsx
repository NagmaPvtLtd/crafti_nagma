"use client";

import Image from "next/image";

import { useCallback, useEffect, useRef, useState } from "react";
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

type PanelProps = Omit<Props, "open">;

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
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || images.length === 0 || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <ViewerPanel
      onClose={onClose}
      images={images}
      index={index}
      onIndexChange={onIndexChange}
      title={title}
    />,
    document.body,
  );
}

/**
 * The open viewer. It mounts with the portal, so Embla initialises once per
 * opening with the real viewport size and the photo the page asked for — and its
 * options never change while it is open (a changing `startIndex` makes
 * embla-carousel-react re-initialise the carousel mid-glide, which is what made
 * the full-screen swipe snap instead of gliding).
 */
function ViewerPanel({
  onClose,
  images,
  index,
  onIndexChange,
  title,
}: PanelProps) {
  const total = images.length;
  const safeIndex = Math.min(Math.max(index, 0), total - 1);

  /* Read once, on mount: Embla only uses `startIndex` when it initialises. */
  const [startIndex] = useState(safeIndex);

  /* `duration` is Embla's tween length (default 25): a longer one glides
     instead of snapping, which a viewport-sized photo needs. Drag threshold and
     skipSnaps stay at their defaults — 6px was twitchy, and a snap-less release
     is what made the full-screen slider feel abrupt. */
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: total > 1,
    startIndex,
    align: "start",
    duration: 45,
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
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowLeft") step(-1);
      else if (event.key === "ArrowRight") step(1);
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, step]);

  return (
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
        {/* Swipe or drag to change photos — the arrows were removed on purpose.
            Padding lives on the slides, never on this viewport: padding here
            offsets Embla's width measurement and breaks the loop/alignment. */}
        <div
          className="h-full cursor-grab overflow-hidden active:cursor-grabbing"
          ref={emblaRef}
        >
          <div className="flex h-full touch-pan-y select-none">
            {images.map((image) => (
              <div
                key={image.id}
                className="h-full min-w-0 shrink-0 grow-0 basis-full px-2 py-3"
              >
                <div className="relative h-full w-full">
                  <Image
                    src={image.url}
                    alt={image.altText || title || "Photo"}
                    fill
                    draggable={false}
                    sizes="100vw"
                    className="object-contain"
                  />
                </div>
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
    </div>
  );
}
