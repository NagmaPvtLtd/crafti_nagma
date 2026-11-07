ALTER TABLE product_variants
ADD COLUMN brief_description VARCHAR(500) DEFAULT NULL
AFTER description,
    ADD COLUMN is_featured BOOLEAN DEFAULT FALSE
AFTER status,
    ADD COLUMN main_showcase BOOLEAN DEFAULT FALSE
AFTER is_featured,
    ADD COLUMN orders_count INT NOT NULL DEFAULT 0
AFTER main_showcase;
-- ===========================================================
-- Global Options
-- ===========================================================
CREATE TABLE global_options (
    id CHAR(40) NOT NULL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) DEFAULT NULL,
    sort_order INT DEFAULT 0,
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
    sort_order INT DEFAULT 0,
    created_by CHAR(40) NOT NULL,
    updated_by CHAR(40) DEFAULT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    UNIQUE KEY uq_global_option_value (option_id, value),
    FOREIGN KEY (option_id) REFERENCES global_options(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
);