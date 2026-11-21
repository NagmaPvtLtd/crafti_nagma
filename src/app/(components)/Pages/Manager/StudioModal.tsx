"use client";

import { createPortal } from "react-dom";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
};

/**
 * Product Studio dialog. The page stays visible behind a white wash — no
 * dark backdrop, no blur — and the panel carries the shadow.
 */
export default function StudioModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide = false,
}: Props) {
  /* The portal target only exists in the browser; during SSR there is nothing
     to render anyway, since a dialog is only ever opened from a click. */
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-70 flex items-center justify-center overflow-hidden bg-white/80 p-3 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-3xl bg-white shadow-2xl shadow-stone-900/20 ring-1 ring-stone-200 sm:max-h-[calc(100dvh-3rem)] ${
          wide ? "max-w-3xl" : "max-w-lg"
        }`}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-stone-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-stone-900">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 text-xs leading-relaxed text-stone-500">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 cursor-pointer rounded-full p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
          {children}
        </div>

        {footer && (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-stone-100 px-5 py-3.5 sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
