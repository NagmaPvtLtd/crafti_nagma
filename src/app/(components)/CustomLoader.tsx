"use client";

import { useEffect, useState } from "react";
import { Heart, Sparkles } from "lucide-react";
import PageWrapper, { PageWrapperVariant } from "./utils/PageWrapper";

const DEFAULT_LABELS = [
  "Warming up the hook…",
  "Untangling the yarn…",
  "Counting stitches…",
  "Almost ready…",
] as const;

const ROTATE_MS = 1800;

function YarnBall({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="animate-cl-squish origin-[50%_58%] motion-reduce:animate-none absolute inset-0 overflow-hidden rounded-full bg-linear-to-br from-rose-300 via-rose-400 to-rose-500 shadow-lg shadow-rose-300/50">
        <svg
          viewBox="0 0 56 56"
          className="h-full w-full text-white/45"
          aria-hidden
        >
          <g
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M-6 21 Q28 1 62 21" />
            <path d="M-6 35 Q28 55 62 35" />
            <path d="M21 -6 Q1 28 21 62" />
            <path d="M35 -6 Q55 28 35 62" />
          </g>
        </svg>
      </div>
      <div className="pointer-events-none absolute left-[24%] top-[15%] h-[16%] w-[27%] rounded-full bg-white/60 blur-[2px]" />
    </div>
  );
}

const FLOATERS = [
  {
    Icon: Heart,
    left: "4%",
    size: 11,
    cls: "text-rose-300",
    delay: "0s",
    dur: "2.9s",
  },
  {
    Icon: Heart,
    left: "80%",
    size: 9,
    cls: "text-rose-200",
    delay: "0.9s",
    dur: "3.3s",
  },
  {
    Icon: Sparkles,
    left: "24%",
    size: 12,
    cls: "text-rose-400/70",
    delay: "1.6s",
    dur: "3.1s",
  },
  {
    Icon: Sparkles,
    left: "66%",
    size: 10,
    cls: "text-rose-300",
    delay: "2.3s",
    dur: "3.5s",
  },
] as const;

type Props = {
  label?: string;
  labels?: readonly string[];
  hint?: string;
  fullScreen?: boolean;
  variant?: PageWrapperVariant;
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

  if (!fullScreen) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <div className="relative flex h-12 w-12 items-center justify-center">
          <div
            className="animate-cl-glow motion-reduce:animate-none absolute inset-1 rounded-full bg-rose-300/35 blur-md"
            aria-hidden
          />
          <svg
            className="animate-cl-spin-slow motion-reduce:animate-none absolute inset-0 h-full w-full text-rose-200"
            viewBox="0 0 100 100"
            fill="none"
            aria-hidden
          >
            <circle
              cx="50"
              cy="50"
              r="46"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="2 13"
            />
          </svg>
          <YarnBall className="h-8 w-8" />
        </div>

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

  return (
    <PageWrapper variant={variant} bgImage={bgImage}>
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="relative flex w-full max-w-sm flex-col items-center gap-4 overflow-hidden rounded-2xl border border-white/60 bg-white/85 px-6 py-8 text-center backdrop-blur-sm sm:rounded-3xl sm:px-8 sm:py-10">
          <div
            className="pointer-events-none absolute -top-16 left-1/2 h-36 w-36 -translate-x-1/2 rounded-full"
            aria-hidden
          />

          <div className="relative flex h-24 w-24 items-center justify-center">
            <div
              className="animate-cl-glow motion-reduce:animate-none absolute inset-2 rounded-full bg-rose-300/35 blur-xl"
              aria-hidden
            />

            {FLOATERS.map(({ Icon, left, size, cls, delay, dur }, i) => (
              <Icon
                key={i}
                size={size}
                aria-hidden
                className={`animate-cl-float motion-reduce:animate-none motion-reduce:opacity-0 pointer-events-none absolute bottom-2 ${cls}`}
                style={{
                  left,
                  animationDelay: delay,
                  animationDuration: dur,
                }}
              />
            ))}

            <svg
              className="animate-cl-spin-slow motion-reduce:animate-none absolute inset-0 h-full w-full text-rose-200"
              viewBox="0 0 100 100"
              fill="none"
              aria-hidden
            >
              <circle
                cx="50"
                cy="50"
                r="46"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="1 9"
              />
            </svg>

            <svg
              className="animate-cl-spin-rev motion-reduce:animate-none absolute inset-0 h-full w-full text-rose-300/70"
              viewBox="0 0 100 100"
              fill="none"
              aria-hidden
            >
              <circle
                cx="50"
                cy="50"
                r="34"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="12 20"
              />
            </svg>

            <YarnBall className="h-14 w-14" />
          </div>

          {activeLabel && (
            <p
              key={activeLabel}
              className="animate-in fade-in font-mono text-sm tracking-tight text-stone-400 duration-300"
            >
              {activeLabel}
            </p>
          )}

          {hint && (
            <p className="text-xs leading-relaxed text-stone-600">{hint}</p>
          )}

          <div className="mt-1 flex items-end gap-1.5" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="animate-cl-bead motion-reduce:animate-none h-1.5 w-1.5 rounded-full bg-rose-400"
                style={{ animationDelay: `${i * 0.16}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
