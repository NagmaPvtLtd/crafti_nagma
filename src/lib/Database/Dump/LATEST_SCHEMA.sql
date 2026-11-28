-- ===========================================================
-- Users
-- ===========================================================
CREATE TABLE users (
    id CHAR(40) NOT NULL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) DEFAULT NULL,
    full_name VARCHAR(255) DEFAULT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NULL,
    password_hash VARCHAR(255) DEFAULT NULL,
    google_id VARCHAR(255) DEFAULT NULL UNIQUE,
    google_profile_picture VARCHAR(500) DEFAULT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    address_line_1 VARCHAR(255) DEFAULT NULL,
    address_line_2 VARCHAR(255) DEFAULT NULL,
    landmark VARCHAR(255) DEFAULT NULL,
    city VARCHAR(100) DEFAULT NULL,
    state VARCHAR(100) DEFAULT NULL,
    postal_code VARCHAR(10) DEFAULT NULL,
    country VARCHAR(100) DEFAULT 'India',
    company_name VARCHAR(255) DEFAULT NULL,
    gstin VARCHAR(20) DEFAULT NULL,
    role ENUM('super_admin', 'admin', 'manager', 'customer') DEFAULT 'customer',
    status ENUM('active', 'inactive', 'banned') DEFAULT 'active',
    profile_completed BOOLEAN DEFAULT FALSE,
    cooldown_till DATETIME DEFAULT NULL,
    failed_password_attempts INT NOT NULL DEFAULT 0,
    last_failed_password_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
);
-- ===========================================================
-- User Sessions (one active row per signed-in device)
-- ===========================================================
CREATE TABLE user_sessions (
    session_id CHAR(40) NOT NULL PRIMARY KEY,
    user_id CHAR(40) NOT NULL,
    created_at DATETIME NOT NULL,
    KEY idx_user_sessions_user_created (user_id, created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
-- ===========================================================
-- Categories
-- ===========================================================
CREATE TABLE categories (
    id CHAR(40) NOT NULL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    parent_id CHAR(40) DEFAULT NULL,
    created_by CHAR(40) NOT NULL,
    updated_by CHAR(40) DEFAULT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE
    SET NULL
);
-- ===========================================================
-- Global Options
-- ===========================================================
CREATE TABLE global_options (
    id CHAR(40) NOT NULL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) DEFAULT NULL,
    created_by CHAR(40) NOT NULL,
    updated_by CHAR(40) DEFAULT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    UNIQUE KEY uq_global_options_name (name),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
);
-- ===========================================================
-- Global Option Values
-- ===========================================================
CREATE TABLE global_option_values (
    id CHAR(40) NOT NULL PRIMARY KEY,
    option_id CHAR(40) NOT NULL,
    value VARCHAR(100) NOT NULL,
    created_by CHAR(40) NOT NULL,
    updated_by CHAR(40) DEFAULT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    UNIQUE KEY uq_global_option_value (option_id, value),
    FOREIGN KEY (option_id) REFERENCES global_options(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
);
-- ===========================================================
-- Products
-- ===========================================================
CREATE TABLE products (
    id CHAR(40) NOT NULL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    brief_description VARCHAR(500) DEFAULT NULL,
    description TEXT DEFAULT NULL,
    meta_title VARCHAR(255) DEFAULT NULL,
    meta_description VARCHAR(500) DEFAULT NULL,
    delivery_charges DECIMAL(10, 2) DEFAULT 0,
    processing_time VARCHAR(100) DEFAULT NULL,
    length DECIMAL(10, 2) DEFAULT NULL,
    width DECIMAL(10, 2) DEFAULT NULL,
    height DECIMAL(10, 2) DEFAULT NULL,
    dimension_unit ENUM('cm', 'in') DEFAULT NULL,
    is_featured BOOLEAN DEFAULT FALSE,
    main_showcase BOOLEAN DEFAULT FALSE,
    orders_count INT DEFAULT 0,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_by CHAR(40) NOT NULL,
    updated_by CHAR(40) DEFAULT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL
);
-- ===========================================================
-- Product Categories (Many-to-Many)
-- ===========================================================
CREATE TABLE product_categories (
    product_id CHAR(40) NOT NULL,
    category_id CHAR(40) NOT NULL,
    PRIMARY KEY (product_id, category_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);
-- ===========================================================
-- Product Options
-- ===========================================================
CREATE TABLE product_options (
    id CHAR(40) NOT NULL PRIMARY KEY,
    product_id CHAR(40) NOT NULL,
    global_option_id CHAR(40) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) DEFAULT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_by CHAR(40) NOT NULL,
    updated_by CHAR(40) DEFAULT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (global_option_id) REFERENCES global_options(id) ON DELETE RESTRICT
);
-- ===========================================================
-- Product Option Values
-- ===========================================================
CREATE TABLE product_option_values (
    id CHAR(40) NOT NULL PRIMARY KEY,
    option_id CHAR(40) NOT NULL,
    global_option_value_id CHAR(40) NOT NULL,
    value VARCHAR(100) NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_by CHAR(40) NOT NULL,
    updated_by CHAR(40) DEFAULT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    FOREIGN KEY (option_id) REFERENCES product_options(id) ON DELETE CASCADE,
    FOREIGN KEY (global_option_value_id) REFERENCES global_option_values(id) ON DELETE RESTRICT
);
-- ===========================================================
-- Product Variants
-- ===========================================================
CREATE TABLE product_variants (
    id CHAR(40) NOT NULL PRIMARY KEY,
    product_id CHAR(40) NOT NULL,
    name VARCHAR(150) DEFAULT NULL,
    description VARCHAR(500) DEFAULT NULL,
    processing_time VARCHAR(100) DEFAULT NULL,
    brief_description VARCHAR(500) DEFAULT NULL,
    sku VARCHAR(100) NOT NULL UNIQUE,
    price DECIMAL(10, 2) NOT NULL,
    compare_at_price DECIMAL(10, 2) DEFAULT NULL,
    stock INT NOT NULL DEFAULT 0,
    hide_stock BOOLEAN NOT NULL DEFAULT FALSE,
    min_order_qty INT DEFAULT NULL,
    max_order_qty INT DEFAULT NULL,
    weight DECIMAL(10, 2) DEFAULT NULL,
    length DECIMAL(10, 2) DEFAULT NULL,
    width DECIMAL(10, 2) DEFAULT NULL,
    height DECIMAL(10, 2) DEFAULT NULL,
    dimension_unit ENUM('cm', 'in') DEFAULT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    is_featured BOOLEAN DEFAULT FALSE,
    main_showcase BOOLEAN DEFAULT FALSE,
    orders_count INT NOT NULL DEFAULT 0,
    created_by CHAR(40) NOT NULL,
    updated_by CHAR(40) DEFAULT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
-- ===========================================================
-- Variant Mapping
-- ===========================================================
CREATE TABLE variant_option_values (
    variant_id CHAR(40) NOT NULL,
    option_value_id CHAR(40) NOT NULL,
    PRIMARY KEY (variant_id, option_value_id),
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    FOREIGN KEY (option_value_id) REFERENCES product_option_values(id) ON DELETE CASCADE
);
-- ===========================================================
-- Product Personalizations
-- ===========================================================
CREATE TABLE product_personalizations (
    id CHAR(40) NOT NULL PRIMARY KEY,
    product_id CHAR(40) NOT NULL,
    title VARCHAR(100) NOT NULL,
    description VARCHAR(255) DEFAULT NULL,
    input_type ENUM('text', 'textarea', 'date') NOT NULL,
    placeholder VARCHAR(255) DEFAULT NULL,
    is_required BOOLEAN DEFAULT FALSE,
    max_length INT DEFAULT NULL,
    created_by CHAR(40) NOT NULL,
    updated_by CHAR(40) DEFAULT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
-- ===========================================================
-- Product Features
-- ===========================================================
CREATE TABLE product_features (
    id CHAR(40) NOT NULL PRIMARY KEY,
    product_id CHAR(40) NOT NULL,
    feature VARCHAR(255) NOT NULL,
    sort_order INT DEFAULT 0,
    created_by CHAR(40) NOT NULL,
    updated_by CHAR(40) DEFAULT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
-- ===========================================================
-- Product Care Instructions
-- ===========================================================
CREATE TABLE product_care_instructions (
    id CHAR(40) NOT NULL PRIMARY KEY,
    product_id CHAR(40) NOT NULL,
    instruction VARCHAR(255) NOT NULL,
    sort_order INT DEFAULT 0,
    created_by CHAR(40) NOT NULL,
    updated_by CHAR(40) DEFAULT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
-- ===========================================================
-- Variant Features (snapshot of the base product's feature list)
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
-- Variant Care Instructions (snapshot of the base product's list)
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
-- ===========================================================
-- Product Gift Included
-- ===========================================================
CREATE TABLE product_gift_included (
    id CHAR(40) NOT NULL PRIMARY KEY,
    product_id CHAR(40) NOT NULL,
    item VARCHAR(255) NOT NULL,
    created_by CHAR(40) NOT NULL,
    updated_by CHAR(40) DEFAULT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
-- ===========================================================
-- Product Reviews
-- ===========================================================
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
    CONSTRAINT fk_product_reviews_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE
    SET NULL,
        CONSTRAINT fk_product_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE
    SET NULL
);
-- ===========================================================
-- ImageKit Files (Centralized File Management - Polymorphic)
-- ===========================================================
CREATE TABLE imagekit_files (
    id CHAR(40) NOT NULL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL DEFAULT 'product_variant',
    entity_id CHAR(40) NOT NULL DEFAULT '',
    source_image_id CHAR(40) DEFAULT NULL,
    file_id VARCHAR(255) DEFAULT NULL UNIQUE,
    url VARCHAR(500) NOT NULL,
    file_purpose ENUM(
        'product_variant_image',
        'category_thumbnail',
        'discount_picture'
    ) DEFAULT NULL,
    file_name VARCHAR(255) DEFAULT NULL,
    alt_text VARCHAR(255) DEFAULT NULL,
    sort_order INT DEFAULT 0,
    created_by CHAR(40) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    UNIQUE KEY uq_imagekit_files_link (source_image_id, entity_id),
    KEY idx_imagekit_files_source (source_image_id),
    CONSTRAINT chk_imagekit_files_entity_type CHECK (
        entity_type = 'product_variant'
        OR entity_type = 'product'
    ),
    CONSTRAINT chk_imagekit_files_file_purpose_variant CHECK (
        (file_purpose IS NULL)
        OR (
            file_purpose = 'product_variant_image'
            AND entity_type = 'product_variant'
            AND entity_id <> ''
        )
    ),
    CONSTRAINT fk_imagekit_files_source FOREIGN KEY (source_image_id) REFERENCES imagekit_files(id) ON DELETE CASCADE,
    CONSTRAINT chk_imagekit_files_origin CHECK (
        (
            source_image_id IS NULL
            AND file_id IS NOT NULL
        )
        OR (
            source_image_id IS NOT NULL
            AND file_id IS NULL
        )
    ),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
-- ===========================================================
-- Carts (one active cart per user; guests use session_id)
-- ===========================================================
CREATE TABLE carts (
    id CHAR(40) NOT NULL PRIMARY KEY,
    user_id CHAR(40) DEFAULT NULL,
    session_id VARCHAR(255) DEFAULT NULL,
    status ENUM('active', 'converted', 'abandoned') DEFAULT 'active',
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_carts_user_active (user_id, status),
    UNIQUE KEY uq_carts_session_active (session_id, status)
);
-- ===========================================================
-- Cart Items
-- ===========================================================
CREATE TABLE cart_items (
    id CHAR(40) NOT NULL PRIMARY KEY,
    cart_id CHAR(40) NOT NULL,
    variant_id CHAR(40) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    personalization_data JSON DEFAULT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    UNIQUE KEY uq_cart_variant (cart_id, variant_id)
);
-- ===========================================================
-- Orders
-- ===========================================================
CREATE TABLE orders (
    id CHAR(40) NOT NULL PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    user_id CHAR(40) DEFAULT NULL,
    shipping_first_name VARCHAR(100) NOT NULL,
    shipping_last_name VARCHAR(100) DEFAULT NULL,
    shipping_phone VARCHAR(20) NOT NULL,
    shipping_email VARCHAR(255) DEFAULT NULL,
    shipping_address_line_1 VARCHAR(255) NOT NULL,
    shipping_address_line_2 VARCHAR(255) DEFAULT NULL,
    shipping_landmark VARCHAR(255) DEFAULT NULL,
    shipping_city VARCHAR(100) NOT NULL,
    shipping_state VARCHAR(100) NOT NULL,
    shipping_postal_code VARCHAR(10) NOT NULL,
    shipping_country VARCHAR(100) DEFAULT 'India',
    subtotal DECIMAL(10, 2) NOT NULL,
    delivery_charges DECIMAL(10, 2) DEFAULT 0,
    discount DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    order_status ENUM(
        'pending',
        'accepted',
        'crafting_in_progress',
        'slight_delay',
        'almost_done',
        'shipped',
        'delivered',
        'cancelled'
    ) DEFAULT 'pending',
    payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
    customer_note TEXT DEFAULT NULL,
    admin_note TEXT DEFAULT NULL,
    tracking_number VARCHAR(100) DEFAULT NULL,
    tracking_url VARCHAR(500) DEFAULT NULL,
    shipped_at DATETIME DEFAULT NULL,
    delivered_at DATETIME DEFAULT NULL,
    cancelled_at DATETIME DEFAULT NULL,
    cancellation_reason VARCHAR(500) DEFAULT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE
    SET NULL
);
-- ===========================================================
-- Order Items (immutable snapshots of purchased items)
-- ===========================================================
CREATE TABLE order_items (
    id CHAR(40) NOT NULL PRIMARY KEY,
    order_id CHAR(40) NOT NULL,
    variant_id CHAR(40) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    variant_name VARCHAR(150) DEFAULT NULL,
    sku VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    total DECIMAL(10, 2) NOT NULL,
    personalization_data JSON DEFAULT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT
);
-- ===========================================================
-- Payments (Razorpay and future gateways)
-- ===========================================================
CREATE TABLE payments (
    id CHAR(40) NOT NULL PRIMARY KEY,
    order_id CHAR(40) NOT NULL,
    gateway VARCHAR(50) NOT NULL DEFAULT 'razorpay',
    gateway_order_id VARCHAR(255) DEFAULT NULL,
    gateway_payment_id VARCHAR(255) DEFAULT NULL,
    gateway_signature VARCHAR(500) DEFAULT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status ENUM(
        'created',
        'authorized',
        'captured',
        'failed',
        'refunded'
    ) DEFAULT 'created',
    method VARCHAR(50) DEFAULT NULL,
    failure_reason VARCHAR(500) DEFAULT NULL,
    raw_response JSON DEFAULT NULL,
    paid_at DATETIME DEFAULT NULL,
    refunded_at DATETIME DEFAULT NULL,
    refund_amount DECIMAL(10, 2) DEFAULT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
-- ===========================================================
-- Audit Logs
-- ===========================================================
CREATE TABLE audit_logs (
    id CHAR(40) NOT NULL PRIMARY KEY,
    user_id CHAR(40) DEFAULT NULL,
    action ENUM(
        'CREATE',
        'UPDATE',
        'DELETE',
        'LOGIN',
        'LOGOUT',
        'ROLE_CHANGED',
        'STATUS_CHANGED',
        'ORDER_CREATED',
        'ORDER_STATUS_CHANGED',
        'ORDER_CANCELLED',
        'PAYMENT_CAPTURED',
        'PAYMENT_FAILED',
        'PAYMENT_REFUNDED',
        'CART_CONVERTED',
        'FILE_UPLOADED',
        'FILE_DELETED'
    ) NOT NULL,
    entity_type ENUM(
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
    ) NOT NULL,
    entity_id CHAR(40) DEFAULT NULL,
    description TEXT NOT NULL,
    metadata JSON DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE
    SET NULL
);
-- ===========================================================
-- Settings Toggle
-- ===========================================================
CREATE TABLE setting_toggle (
    field_name VARCHAR(100) NOT NULL PRIMARY KEY,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    save_in_redis BOOLEAN NOT NULL DEFAULT TRUE
);
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