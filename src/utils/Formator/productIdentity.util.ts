/**
 * productIdentity.util.ts
 *
 * One readable identity scheme for products and their variants.
 *
 *   product  → {PREFIX}-P{YY}00-{last 4 of product id}
 *   variant  → {PREFIX}-P{YY}{NN}-{last 4 of variant id}-{VALUE-VALUE}
 *
 * `PREFIX` is the first four letters/digits of the product name, `YY` is the
 * two-digit creation year, `00` marks the base product and `NN` counts the
 * variants of that product from 01.
 *
 *   CHARGER COVER          → CHAR-P2600-JB29
 *   its Red / Large variant → CHAR-P2601-3S52-RED-LARGE
 */

const PREFIX_LENGTH = 4;
const SKU_MAX_LENGTH = 100;

/** "Charger Cover" → "CHAR". Always four characters, padded with X. */
export function productCodePrefix(name: string): string {
  const letters = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const prefix = letters.slice(0, PREFIX_LENGTH) || "PRD";
  return prefix.padEnd(PREFIX_LENGTH, "X");
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
