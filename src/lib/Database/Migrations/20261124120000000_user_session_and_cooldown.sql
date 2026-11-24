-- ===========================================================
-- Users — single active session + password cooldown
-- ===========================================================
-- session_id: the session currently allowed to use this account. A new
--   sign-in (Google or password) rotates it, so older JWTs stop passing
--   requireAuth. A password change also rotates it, forcing every device
--   to sign in again.
-- cooldown_till: when set and in the future, password sign-in is refused
--   until that UTC timestamp (24 hours after too many wrong passwords).
-- ===========================================================

ALTER TABLE users
    ADD COLUMN session_id CHAR(40) DEFAULT NULL AFTER profile_completed,
    ADD COLUMN cooldown_till DATETIME DEFAULT NULL AFTER session_id;
