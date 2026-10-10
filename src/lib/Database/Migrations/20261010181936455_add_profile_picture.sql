ALTER TABLE users
ADD COLUMN google_profile_picture VARCHAR(500) DEFAULT NULL
AFTER google_id;