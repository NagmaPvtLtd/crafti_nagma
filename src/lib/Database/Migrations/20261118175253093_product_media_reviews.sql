-- Product Studio — reviews only
-- ===========================================================

-- Base product images live ONLY on imagekit_files; every file is
-- labelled `product_variant_image` and is fetched through the
-- `imagekit_files.file_purpose` enum.
CREATE TABLE IF NOT EXISTS product_reviews (
    id CHAR(40) NOT NULL PRIMARY KEY,
    product_id CHAR(40) NOT NULL,
    variant_id CHAR(40) DEFAULT NULL,
    user_id CHAR(40) DEFAULT NULL,
    reviewer_name VARCHAR(150) NOT NULL,
    rating TINYINT UNSIGNED NOT NULL,
    title VARCHAR(200) DEFAULT NULL,
    comment TEXT DEFAULT NULL,
    is_approved BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    KEY idx_product_reviews_product (product_id),
    CONSTRAINT fk_product_reviews_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_product_reviews_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
    CONSTRAINT fk_product_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
