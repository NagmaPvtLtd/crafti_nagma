/**
 * Turns free text into Pascal/Title case for display names.
 *
 *   toPascalCase("light blue")   → "Light Blue"
 *   toPascalCase("  XL ")        → "XL"
 *   toPascalCase("cotton yarn")  → "Cotton Yarn"
 *
 * Only the first letter of each word is touched, so acronyms and words that
 * already carry internal capitals ("iPhone", "XL") keep their shape.
 * Whitespace is collapsed to single spaces.
 */
export function toPascalCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
