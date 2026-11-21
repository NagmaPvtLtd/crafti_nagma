"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

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
 * Full-screen photo viewer on a white canvas. Left/right arrows and a
 * thumbnail strip for desktop, swipe for touch, arrow keys and Esc on a
 * keyboard. Rendered through a portal so fixed page chrome cannot cover it.
 */
export default function PhotoViewer({
  open,
  onClose,
  images,
  index,
  onIndexChange,
  title,
}: Props) {
  const touchX = useRef<number | null>(null);

  const total = images.length;
  const safeIndex = total === 0 ? 0 : Math.min(Math.max(index, 0), total - 1);
  const active = images[safeIndex];

  useEffect(() => {
    if (!open || total === 0) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowLeft")
        onIndexChange((safeIndex - 1 + total) % total);
      else if (event.key === "ArrowRight") onIndexChange((safeIndex + 1) % total);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, total, safeIndex, onClose, onIndexChange]);

  if (!open || !active || typeof document === "undefined") return null;

  function step(delta: number) {
    if (total < 2) return;
    onIndexChange((safeIndex + delta + total) % total);
  }

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

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center bg-white px-2 py-3 sm:px-20"
        onTouchStart={(event) => {
          touchX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const start = touchX.current;
          touchX.current = null;
          if (start === null) return;
          const end = event.changedTouches[0]?.clientX ?? start;
          const delta = end - start;
          if (Math.abs(delta) < 45) return;
          step(delta > 0 ? -1 : 1);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={active.url}
          alt={active.altText || title || "Photo"}
          draggable={false}
          className="max-h-full max-w-full object-contain select-none"
        />

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous photo"
              className="absolute top-1/2 left-1 z-10 inline-flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/95 text-stone-700 shadow-lg ring-1 ring-stone-200 transition-colors hover:bg-stone-50 sm:left-4 sm:h-12 sm:w-12"
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next photo"
              className="absolute top-1/2 right-1 z-10 inline-flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/95 text-stone-700 shadow-lg ring-1 ring-stone-200 transition-colors hover:bg-stone-50 sm:right-4 sm:h-12 sm:w-12"
            >
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </>
        )}
      </div>

      {total > 1 && (
        <div className="flex shrink-0 items-center justify-center gap-2 overflow-x-auto px-3 py-3">
          {images.map((image, i) => (
            <button
              key={image.id}
              type="button"
              onClick={() => onIndexChange(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-pressed={i === safeIndex}
              className={`h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 transition-colors ${
                i === safeIndex
                  ? "border-rose-400"
                  : "border-transparent hover:border-rose-200"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.altText || title || "Photo"}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
