import { type RangeType } from "./adminRange.types";

export { type RangeType } from "./adminRange.types";

/**
 * Shared admin time-range vocabulary.
 *
 * Centralised so the two admin API routes and the admin client components
 * all agree on the allowed values, the label map, and the parse rule.
 *
 * The only thing that differs per consumer is the *fallback* for an
 * unrecognized/empty value:
 *   - dashboard  → "90d"
 *   - audit-logs → "30d"
 */
export const ALLOWED_RANGES = ["30d", "90d", "365d", "lifetime"] as const;

export const RANGES: { value: RangeType; label: string }[] = [
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "365d", label: "1y" },
  { value: "lifetime", label: "All" },
];

export const RANGE_LABELS: Record<RangeType, string> = Object.fromEntries(
  RANGES.map((r) => [r.value, r.label]),
) as Record<RangeType, string>;

/**
 * Parse a query-string range value into a `RangeType`.
 *
 * Unknown/empty values fall back to `fallback` (default `"90d"`).
 */
export function parseRange(
  v: string | null,
  fallback: RangeType = "90d",
): RangeType {
  return v && (ALLOWED_RANGES as readonly string[]).includes(v)
    ? (v as RangeType)
    : fallback;
}
