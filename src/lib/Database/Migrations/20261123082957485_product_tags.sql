-- ===========================================================
-- Global Tags (centralised, reusable tag master)
-- ===========================================================
CREATE TABLE global_tags (
    id CHAR(40) NOT NULL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    created_by CHAR(40) NOT NULL,
    updated_by CHAR(40) DEFAULT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    UNIQUE KEY uq_global_tags_name (name),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
);
-- ===========================================================
-- Product Tag Mappings (base product tags, inherited by variants)
-- ===========================================================
CREATE TABLE product_tag_mappings (
    product_id CHAR(40) NOT NULL,
    tag_id CHAR(40) NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (product_id, tag_id),
    KEY idx_product_tag_mappings_tag (tag_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES global_tags(id) ON DELETE CASCADE
);
-- ===========================================================
-- Product Variant Tag Mappings (variant-specific additional tags only)
-- ===========================================================
CREATE TABLE product_variant_tag_mappings (
    variant_id CHAR(40) NOT NULL,
    tag_id CHAR(40) NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (variant_id, tag_id),
    KEY idx_product_variant_tag_mappings_tag (tag_id),
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES global_tags(id) ON DELETE CASCADE
);
-- ===========================================================
-- Audit logs: tags are audited through their own entity type
-- ===========================================================
ALTER TABLE audit_logs
MODIFY COLUMN entity_type ENUM(
        'USER',
        'CATEGORY',
        'PRODUCT',
        'VARIANT',
        'OPTION',
        'OPTION_VALUE',
        'PERSONALIZATION',
        'FEATURE',
        'CARE_INSTRUCTION',
        'GIFT_INCLUDED',
        'IMAGEKIT_FILE',
        'CART',
        'CART_ITEM',
        'ORDER',
        'ORDER_ITEM',
        'PAYMENT',
        'TAG',
        'SYSTEM'
    ) NOT NULL;