-- Remove sort_order from tables where manual ordering is not required.
-- Run this migration once against your existing database.
ALTER TABLE categories DROP COLUMN sort_order;
ALTER TABLE global_options DROP COLUMN sort_order;
ALTER TABLE global_option_values DROP COLUMN sort_order;
ALTER TABLE product_options DROP COLUMN sort_order;
ALTER TABLE product_option_values DROP COLUMN sort_order;
ALTER TABLE product_variants DROP COLUMN sort_order;
ALTER TABLE product_personalizations DROP COLUMN sort_order;
ALTER TABLE product_gift_included DROP COLUMN sort_order;