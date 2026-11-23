/* -------------------------------------------------------------------------- */
/*  Pricing suggestions                                                       */
/* -------------------------------------------------------------------------- */

/**
 * @brief Price the pricing quiz currently suggests when nothing is known.
 *
 * @description
 * Fallback used by generated variants and the API default when the quiz has no
 * answers yet. `suggestPrice` below still returns this flat ₹100.
 */
export const QUIZ_SUGGESTED_PRICE = 100;

/**
 * @brief Share of paid hours that is actually productive.
 *
 * @description
 * Setup, breaks and idle time eat into paid hours. Only this share of the
 * month is treated as work that can be charged to a product.
 */
export const PRODUCTIVE_HOUR_SHARE = 0.85;

/** Rounding choices offered by the pricing quiz. */
export type QuizRounding = "floor" | "ceil" | "original";

export interface PricingInput {
  /** How many option values the product exposes (Colour × Size …). */
  optionValueCount?: number;
  /** How many categories the product is filed under. */
  categoryCount?: number;
  /** Delivery the customer is charged — excluded from the item price. */
  deliveryCharges?: number;
}

/**
 * @brief Suggest a selling price for a product variant.
 *
 * @description
 * Algorithm (TODO — not implemented yet):
 *   1. Ask the quiz for material cost, crafting hours, packaging and margin.
 *   2. cost      = material + hours × hourly rate + packaging
 *   3. price     = cost × (1 + margin) + complexity uplift
 *                  (optionValueCount and categoryCount both add a small %)
 *   4. Round up to the next ₹9 ending so prices read like ₹1,299.
 *
 * Until the quiz collects those numbers, this returns the flat placeholder so
 * the UI, the API default and the generated variants all agree on one value.
 */
export function suggestPrice(input: PricingInput = {}): number {
  // TODO(pricing): replace this stub with the cost model described above.
  void input;
  return QUIZ_SUGGESTED_PRICE;
}

/**
 * @brief Paid hours in a month that can actually be billed.
 *
 * @description
 * Working days × hours per day, minus the non-productive share
 * (`PRODUCTIVE_HOUR_SHARE`). Dividing a monthly salary by total attendance
 * hours would understate the real cost of one productive hour.
 */
export function productiveHoursPerMonth(
  hoursPerDay: number,
  daysPerMonth: number,
): number {
  const hours =
    Math.max(0, hoursPerDay) * Math.max(0, daysPerMonth) * PRODUCTIVE_HOUR_SHARE;
  return Math.round(hours * 10) / 10;
}

/** @brief Monthly labour cost spread over the productive hours it buys. */
export function hourlyLabourRate(
  monthlySalary: number,
  productiveHours: number,
): number {
  if (!(monthlySalary > 0) || !(productiveHours > 0)) return 0;
  return monthlySalary / productiveHours;
}

export interface QuizPriceInput {
  /** Material / yarn cost for one piece. */
  materialCost: number;
  /** Minutes of productive work one piece takes. */
  minutes: number;
  /** Hourly labour rate from `hourlyLabourRate`. */
  hourlyRate: number;
  /** Packaging for one piece. */
  packagingCost: number;
  /** Markup over cost, in percent. */
  marginPercent: number;
}

/** @brief What one piece costs to make (material + labour + packaging). */
export function quizCost(input: QuizPriceInput): number {
  const labour = (Math.max(0, input.minutes) / 60) * Math.max(0, input.hourlyRate);
  const cost =
    Math.max(0, input.materialCost) + labour + Math.max(0, input.packagingCost);
  return Math.round(cost * 100) / 100;
}

/** @brief Suggested selling price: cost plus margin. */
export function quizPrice(input: QuizPriceInput): number {
  const cost = quizCost(input);
  const price = cost * (1 + Math.max(0, input.marginPercent) / 100);
  return Math.round(price * 100) / 100;
}

/**
 * @brief Snap a price to a readable ending.
 *
 * @description
 * `floor` → largest ₹…99 below the price, `ceil` → smallest ₹…99 at or above
 * it, `original` → untouched. So 487.34 becomes 399, 499 or 487.34.
 */
export function roundQuizPrice(price: number, mode: QuizRounding): number {
  if (!(price > 0)) return 0;
  if (mode === "original") return Math.round(price * 100) / 100;

  const step = 100;
  const snapped =
    (mode === "floor" ? Math.floor((price + 1) / step) : Math.ceil((price + 1) / step)) *
      step -
    1;

  // Below ₹100 the charm ending would go negative — keep a plain round instead.
  return snapped >= 9 ? snapped : Math.max(1, Math.round(price));
}
