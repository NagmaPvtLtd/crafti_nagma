"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import PageWrapper, { PageWrapperVariant } from "./utilts/PageWrapper";

/* ============================================================================
 * CustomLoader — Crafti Nagma rose/stone theme
 * ============================================================================
 * fullScreen=true  → PageWrapper with bg + centered glassy loader card
 * fullScreen=false → inline loader, transparent, for section-level use
 *
 * Label rotation:
 *   Pass `label`      → that text stays (no rotation)
 *   Pass `labels`     → cycles through the array every 1.8s
 *   Pass neither      → uses DEFAULT_LABELS
 * ========================================================================== */

/** Rotates when no explicit label/labels are given. Handmade-flavored. */
const DEFAULT_LABELS = [
  "Warming up the hook…",
  "Untangling the yarn…",
  "Counting stitches…",
  "Almost ready…",
] as const;

const ROTATE_MS = 1800;

type Props = {
  /** A single fixed label. Disables rotation. */
  label?: string;
  /** A list of labels to cycle through. Ignored if `label` is set. */
  labels?: readonly string[];
  /** Smaller muted sub-text under the label. */
  hint?: string;
  fullScreen?: boolean;
  /** Only used when `fullScreen` is true. Defaults to "form". */
  variant?: PageWrapperVariant;
  /** Override the PageWrapper bg image (falls back to its own default). */
  bgImage?: string;
};

export default function CustomLoader({
  label,
  labels,
  hint,
  fullScreen = true,
  variant = "form",
  bgImage,
}: Props) {
  const rotation = labels && labels.length > 0 ? labels : DEFAULT_LABELS;
  const shouldRotate = !label && rotation.length > 1;

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!shouldRotate) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % rotation.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [shouldRotate, rotation.length]);

  const activeLabel = label ?? rotation[index];

  /* ------------------------------------------------------------------ */
  /* Inline (section-level) — no PageWrapper, no bg                     */
  /* ------------------------------------------------------------------ */
  if (!fullScreen) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <Loader2 size={22} className="animate-spin text-rose-500" aria-hidden />

        {activeLabel && (
          <p
            key={activeLabel}
            className="animate-in fade-in text-xs font-medium tracking-wide text-stone-600 duration-300"
          >
            {activeLabel}
          </p>
        )}

        {hint && <p className="text-[11px] text-stone-500">{hint}</p>}
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Fullscreen — wrapped in PageWrapper                                */
  /* ------------------------------------------------------------------ */
  return (
    <PageWrapper variant={variant} bgImage={bgImage}>
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-white/60 bg-white/85 px-6 py-8 text-center backdrop-blur-sm sm:rounded-3xl sm:px-8 sm:py-10">
          <Loader2
            size={28}
            className="animate-spin text-rose-500"
            aria-hidden
          />

          {/* Label — keyed so it re-mounts and fade-in replays each change */}
          {activeLabel && (
            <p
              key={activeLabel}
              className="animate-in fade-in text-sm font-mono tracking-tight text-stone-400 duration-300"
            >
              {activeLabel}
            </p>
          )}

          {hint && (
            <p className="text-xs leading-relaxed text-stone-600">{hint}</p>
          )}

          <div className="mt-1 flex items-center gap-1" aria-hidden>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-300 [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400 [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
