-- Mark existing profiles complete when every required profile detail is filled.
UPDATE users
SET profile_completed = (
    NULLIF(TRIM(first_name), '') IS NOT NULL
    AND NULLIF(TRIM(last_name), '') IS NOT NULL
    AND NULLIF(TRIM(phone), '') IS NOT NULL
    AND NULLIF(TRIM(address_line_1), '') IS NOT NULL
    AND NULLIF(TRIM(address_line_2), '') IS NOT NULL
    AND NULLIF(TRIM(landmark), '') IS NOT NULL
    AND NULLIF(TRIM(city), '') IS NOT NULL
    AND NULLIF(TRIM(state), '') IS NOT NULL
    AND NULLIF(TRIM(postal_code), '') IS NOT NULL
  );