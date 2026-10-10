-- ===========================================================
-- Settings Toggle
-- ===========================================================
CREATE TABLE setting_toggle (
    field_name VARCHAR(100) NOT NULL PRIMARY KEY,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    save_in_redis BOOLEAN NOT NULL DEFAULT TRUE
);