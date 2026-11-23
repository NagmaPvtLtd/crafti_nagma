-- ===========================================================
-- Product dimensions (optional, shared unit per product/variant)
-- ===========================================================
ALTER TABLE products
    ADD COLUMN length DECIMAL(10, 2) DEFAULT NULL AFTER processing_time,
    ADD COLUMN width DECIMAL(10, 2) DEFAULT NULL AFTER length,
    ADD COLUMN height DECIMAL(10, 2) DEFAULT NULL AFTER width,
    ADD COLUMN dimension_unit ENUM('cm', 'in') DEFAULT NULL AFTER height;

ALTER TABLE product_variants
    ADD COLUMN length DECIMAL(10, 2) DEFAULT NULL AFTER weight,
    ADD COLUMN width DECIMAL(10, 2) DEFAULT NULL AFTER length,
    ADD COLUMN height DECIMAL(10, 2) DEFAULT NULL AFTER width,
    ADD COLUMN dimension_unit ENUM('cm', 'in') DEFAULT NULL AFTER height;

-- ===========================================================
-- Options / values can be disabled instead of deleted when they
-- are still referenced by variants that already have orders.
-- ===========================================================
ALTER TABLE product_options
    ADD COLUMN status ENUM('active', 'inactive') DEFAULT 'active' AFTER description;

ALTER TABLE product_option_values
    ADD COLUMN status ENUM('active', 'inactive') DEFAULT 'active' AFTER value;

-- ===========================================================
-- Variant feature bullets (snapshot of the base product's list)
-- ===========================================================
CREATE TABLE product_variant_features (
    id CHAR(40) NOT NULL PRIMARY KEY,
    variant_id CHAR(40) NOT NULL,
    feature VARCHAR(255) NOT NULL,
    sort_order INT DEFAULT 0,
    created_by CHAR(40) NOT NULL,
    updated_by CHAR(40) DEFAULT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
);

-- ===========================================================
-- Variant care instructions (snapshot of the base product's list)
-- ===========================================================
CREATE TABLE product_variant_care_instructions (
    id CHAR(40) NOT NULL PRIMARY KEY,
    variant_id CHAR(40) NOT NULL,
    instruction VARCHAR(255) NOT NULL,
    sort_order INT DEFAULT 0,
    created_by CHAR(40) NOT NULL,
    updated_by CHAR(40) DEFAULT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
);
