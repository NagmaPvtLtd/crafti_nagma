"use client";

import { useEffect } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "neutral";
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/**
 * Shared confirmation panel. Use this instead of `window.confirm` for
 * destructive actions (deleting a variant, unlinking a shared photo, …).
 * Stays above `StudioModal` so it can be opened from inside a dialog.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  loading = false,
  onConfirm,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, loading, onClose]);

  if (!open) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-80 flex items-center justify-center bg-stone-900/25 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl shadow-stone-900/20 ring-1 ring-stone-200 sm:p-6">
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              tone === "danger"
                ? "bg-rose-50 text-rose-600"
                : "bg-stone-100 text-stone-600"
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
          </span>

          <div className="min-w-0">
            <h2 className="text-base font-semibold text-stone-900">{title}</h2>
            {description && (
              <div className="mt-1 text-xs leading-relaxed text-stone-500">
                {description}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="cursor-pointer rounded-full border border-stone-200 bg-white px-4 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              tone === "danger"
                ? "bg-rose-500 shadow-rose-500/25 hover:bg-rose-600"
                : "bg-stone-800 shadow-stone-900/20 hover:bg-stone-900"
            }`}
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
