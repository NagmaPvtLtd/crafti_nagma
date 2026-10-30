-- Link product-specific options to their reusable global option definitions.
ALTER TABLE product_options
ADD COLUMN global_option_id CHAR(40) DEFAULT NULL
AFTER product_id,
    ADD CONSTRAINT fk_product_options_global_option FOREIGN KEY (global_option_id) REFERENCES global_options(id) ON DELETE
SET NULL;
-- Link product-specific option values to their reusable global values.
ALTER TABLE product_option_values
ADD COLUMN global_option_value_id CHAR(40) DEFAULT NULL
AFTER option_id,
    ADD CONSTRAINT fk_product_option_values_global_value FOREIGN KEY (global_option_value_id) REFERENCES global_option_values(id) ON DELETE
SET NULL;