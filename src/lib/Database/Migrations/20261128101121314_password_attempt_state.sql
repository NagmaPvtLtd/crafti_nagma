-- Persistent password-attempt state for a sliding 24-hour window.
ALTER TABLE users
ADD COLUMN failed_password_attempts INT NOT NULL DEFAULT 0;

ALTER TABLE users
ADD COLUMN last_failed_password_at DATETIME DEFAULT NULL;
