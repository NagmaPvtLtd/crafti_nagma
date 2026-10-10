-- ===========================================================
-- Audit Logs
-- ===========================================================
CREATE TABLE audit_logs (
    id CHAR(40) NOT NULL PRIMARY KEY,
    user_id CHAR(40) DEFAULT NULL,
    -- who performed the action
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
        'SYSTEM'
    ) NOT NULL,
    entity_id CHAR(40) DEFAULT NULL,
    -- the affected record, if any
    description TEXT NOT NULL,
    metadata JSON DEFAULT NULL,
    -- optional before/after snapshot
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE
    SET NULL
);