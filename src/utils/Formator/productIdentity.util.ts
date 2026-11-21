/**
 * productIdentity.util.ts
 *
 * One readable identity scheme for products and their variants.
 *
 *   product  → {PREFIX}-P{YY}00-{last 4 of product id}
 *   variant  → {PREFIX}-P{YY}{NN}-{last 4 of variant id}-{VALUE-VALUE}
 *
 * `PREFIX` is four random letters drawn (without repetition, skipping spaces)
 * from anywhere in the product name, uppercased. When the name has fewer than
 * four alphanumeric characters, the result is padded with `X`.
 *
 *   CHARGER COVER          → AGE-C2600-JB29   (random pick from CHARGERCOVER)
 *   its Red / Large variant → AGE-C2601-3S52-RED-LARGE
 */

const PREFIX_LENGTH = 4;
const SKU_MAX_LENGTH = 100;

/**
 * "Charger Cover" → e.g. "AGE".
 *
 * Randomly picks `PREFIX_LENGTH` distinct alphanumeric characters from the
 * whole name (spaces and punctuation are ignored), uppercased. Repeats of the
 * same letter are skipped so each picked position contributes a unique char.
 * When fewer than `PREFIX_LENGTH` distinct letters exist, the result is padded
 * with `X`.
 */
export function productCodePrefix(name: string): string {
  const letters = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  if (letters.length === 0) {
    return "PRD".padEnd(PREFIX_LENGTH, "X");
  }

  const picked: string[] = [];
  const seen = new Set<string>();
  const indices = Array.from({ length: letters.length }, (_, i) => i);

  // Fisher-Yates shuffle, stopped early once we have enough distinct letters.
  for (let i = indices.length - 1; i > 0 && picked.length < PREFIX_LENGTH; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];

    const candidate = letters[indices[i]];
    if (!seen.has(candidate)) {
      seen.add(candidate);
      picked.push(candidate);
    }
  }

  return picked.join("").padEnd(PREFIX_LENGTH, "X");
}

/** 2026 → "26". */
export function productYearToken(date: Date = new Date()): string {
  return String(date.getFullYear()).slice(-2);
}

/** Base product code: PREFIX-PYY00 + the last four characters of its id. */
export function buildProductCode(
  name: string,
  productId: string,
  date: Date = new Date(),
): string {
  const year = productYearToken(date);
  return `${productCodePrefix(name)}-P${year}00-${productId.slice(-4)}`;
}

/** One option value as a SKU token: "Rose Pink" → "ROSE-PINK". */
export function skuToken(value: string): string {
  return (
    value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "V"
  );
}

/**
 * Variant SKU: PREFIX-PYY{sequence}-{last 4 of variant id}-{values}.
 * `sequence` is 1-based within its product.
 */
export function buildVariantSku({
  productName,
  variantId,
  sequence,
  values,
  date = new Date(),
}: {
  productName: string;
  variantId: string;
  sequence: number;
  values: string[];
  date?: Date;
}): string {
  const year = productYearToken(date);
  const sequenceToken = String(Math.max(1, Math.trunc(sequence))).padStart(
    2,
    "0",
  );

  const parts = [
    productCodePrefix(productName),
    `P${year}${sequenceToken}`,
    variantId.slice(-4),
    ...values.map(skuToken),
  ];

  return parts.join("-").slice(0, SKU_MAX_LENGTH);
}
