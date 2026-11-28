-- Per-device authentication sessions replace the shared users.session_id value.
CREATE TABLE user_sessions (
    session_id CHAR(40) NOT NULL PRIMARY KEY,
    user_id CHAR(40) NOT NULL,
    created_at DATETIME NOT NULL,
    KEY idx_user_sessions_user_created (user_id, created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE users
DROP COLUMN session_id;
