import type { CartItemView } from "../../types/Cart.types";

/**
 * How many pieces of one line count as a large order.
 *
 * Crafti Nagma is one person making every piece by hand. The cart shows a
 * reassuring note above the summary once any available line reaches this
 * amount: the shopper should order without hesitation, and anything bigger is
 * just a message away. Nothing is blocked.
 */
export const BULK_AVAILABILITY_THRESHOLD = 6;

/**
 * Copy shown above the cart summary for a large line. Kept here next to the
 * threshold so the wording and the limit can never drift apart.
 */
export const BULK_AVAILABILITY_NOTICE =
  "Large quantity — please place the order without hesitation. Need even more than this? Just contact us and we'll make and ship that much quantity for you as well.";

/**
 * @brief Does this cart need the availability note?
 *
 * @param {CartItemView[]} items - The cart lines as the API returned them
 * @returns {boolean} `true` when any *available* line reaches the threshold
 *
 * @description Unavailable lines do not count: they are already priced out of
 *              the subtotal and will not be produced.
 */
export function needsAvailabilityNotice(items: CartItemView[]): boolean {
  return items.some(
    (item) => item.available && item.quantity >= BULK_AVAILABILITY_THRESHOLD,
  );
}
