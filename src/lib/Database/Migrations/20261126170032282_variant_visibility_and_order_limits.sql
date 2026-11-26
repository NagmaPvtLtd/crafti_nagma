-- ---------------------------------------------------------------------------
-- Per-variant stock visibility, processing time and order limits
--
-- hide_stock      — the "show as out of stock" toggle. The real `stock` count is
--                   never touched; the storefront simply reads the variant as 0.
-- processing_time — the variant's own snapshot of the base product's processing
--                   time, so a slower option can say so on its product page.
-- min_order_qty   — smallest quantity a shopper may order (NULL = 1).
-- max_order_qty   — largest quantity a shopper may order (NULL = no limit; the
--                   cart still caps at MAX_CART_QUANTITY, 100 per line).
--
-- Both order limits are optional, so existing variants keep today's behaviour.
--
-- One statement, no AFTER clauses, on purpose:
--   * TiDB checks every clause of a multi-change ALTER against the table as it
--     existed BEFORE the statement, so `ADD COLUMN hide_stock …, ADD COLUMN
--     min_order_qty … AFTER hide_stock` failed with ER_BAD_FIELD_ERROR (1054)
--     on production. Local MySQL accepts it, TiDB Cloud does not.
--   * One ALTER also makes the change atomic: it adds all four columns or none,
--     so a retry can never stop on a half-applied file ("Duplicate column
--     name"). A separate ALTER per column would have allowed exactly that — the
--     first column applied, a later statement fails, and every retry then dies
--     on the first column.
--   * Columns land at the end of the table in production instead of being
--     interleaved; every query names its columns explicitly, so the physical
--     order is cosmetic only.
-- ---------------------------------------------------------------------------

ALTER TABLE product_variants
  ADD COLUMN processing_time VARCHAR(100) DEFAULT NULL,
  ADD COLUMN hide_stock BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN min_order_qty INT DEFAULT NULL,
  ADD COLUMN max_order_qty INT DEFAULT NULL;
