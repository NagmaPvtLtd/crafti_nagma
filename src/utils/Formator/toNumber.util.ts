/** MySQL returns DECIMAL/SUM values as strings — coerce to a finite number. */
export function toNumber(value: number | string | null): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
