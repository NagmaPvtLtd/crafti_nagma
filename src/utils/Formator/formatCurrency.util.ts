/**
 * formatCurrency.util.ts
 *
 * Single source of truth for formatting currency across the app.
 *
 * Currently hardcoded to INR (Indian Rupees) with the en-IN locale,
 * matching every local `inr()` helper that was doing the same thing.
 */

export function formatCurrency(
  value: number,
  options?: {
    /** Default: "en-IN" */
    locale?: string;
    /** Default: "INR" */
    currency?: string;
    /** Default: 0 — no decimal places for INR */
    maximumFractionDigits?: number;
  },
): string {
  return new Intl.NumberFormat(
    options?.locale ?? "en-IN",
    {
      style: "currency",
      currency: options?.currency ?? "INR",
      maximumFractionDigits: options?.maximumFractionDigits ?? 0,
    },
  ).format(value);
}
