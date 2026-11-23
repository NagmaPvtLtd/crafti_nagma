/**
 * Capitalizes the first letter of a sentence, leaving the rest untouched.
 *
 *   capitalizeFirst("gentle hand wash") → "Gentle hand wash"
 *   capitalizeFirst("XL size")          → "XL size"
 *
 * Used by the backend for features and care instructions so a manager who
 * types everything in lowercase still ends up with presentable copy.
 */
export function capitalizeFirst(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
