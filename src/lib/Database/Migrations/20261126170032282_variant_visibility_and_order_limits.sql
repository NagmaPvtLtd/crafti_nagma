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
-- One ALTER per column on purpose: TiDB validates every clause of a multi-change
-- ALTER against the table as it exists BEFORE the statement, so
-- `ADD COLUMN hide_stock …, ADD COLUMN min_order_qty … AFTER hide_stock` fails
-- with ER_BAD_FIELD_ERROR (1054). Local MySQL accepts it, TiDB Cloud does not.
-- ---------------------------------------------------------------------------
ALTER TABLE product_variants
ADD COLUMN processing_time VARCHAR(100) DEFAULT NULL
AFTER description;
ALTER TABLE product_variants
ADD COLUMN hide_stock BOOLEAN NOT NULL DEFAULT FALSE
AFTER stock;
ALTER TABLE product_variants
ADD COLUMN min_order_qty INT DEFAULT NULL
AFTER hide_stock;
ALTER TABLE product_variants
ADD COLUMN max_order_qty INT DEFAULT NULL
AFTER min_order_qty;