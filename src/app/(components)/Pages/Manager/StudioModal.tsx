"use client";

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
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-white/80 p-4 py-10 sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full ${
          wide ? "max-w-3xl" : "max-w-lg"
        } rounded-3xl bg-white shadow-2xl shadow-stone-900/20 ring-1 ring-stone-200`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-stone-100 px-5 py-4 sm:px-6">
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

        <div className="px-5 py-4 sm:px-6">{children}</div>

        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-stone-100 px-5 py-3.5 sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
