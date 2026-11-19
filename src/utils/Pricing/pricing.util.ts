/* -------------------------------------------------------------------------- */
/*  Pricing suggestions                                                       */
/* -------------------------------------------------------------------------- */

/**
 * @brief Price the pricing quiz currently suggests.
 *
 * @description
 * Placeholder: every quiz answer ends with the same flat suggestion of ₹100.
 * The real model is a TODO — see `suggestPrice` below.
 */
export const QUIZ_SUGGESTED_PRICE = 100;

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
