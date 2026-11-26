/**
 * The most pieces one cart line can hold.
 *
 * A deliberate, e-commerce-style per-line cap (Amazon caps a listing's order
 * quantity the same way) so an accidental keystroke or a stuck stepper can never
 * queue an absurd number. It is the only app-level ceiling: a variant whose
 * `max_order_qty` is blank is unlimited up to this, never up to its stock count,
 * and the manager's optional `max_order_qty` can only lower the bound.
 */
export const MAX_CART_QUANTITY = 100;
