ALTER TABLE users
MODIFY COLUMN phone VARCHAR(20) NULL,
    DROP INDEX phone,
    ADD UNIQUE KEY uq_users_phone (phone);