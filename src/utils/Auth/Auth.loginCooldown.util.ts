/**
 * Pure helpers for the password-login cooldown. Server code lives in
 * `Auth.loginGuard.util.ts`; this file is safe to import from the browser.
 */

/** Consecutive wrong passwords before a cooldown starts. */
export const MAX_FAILED_PASSWORD_ATTEMPTS = 7;

/** Cooldown length after too many wrong passwords. */
export const LOGIN_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** Marks a thrown credentials error whose suffix is already user-facing text. */
export const LOGIN_COOLDOWN_PREFIX = "login_cooldown|";

/**
 * Reads a MySQL DATETIME value into a Date.
 *
 * @function toDate
 * @description `mysql2` returns DATETIME as a Date by default, but a string comes
 *              back when `dateStrings` is on. Both forms are accepted; anything
 *              unparseable becomes `null`.
 *
 * @param {string | Date | null | undefined} value - Raw column value
 *
 * @returns {Date | null} Parsed date or null
 */
function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Builds the user-facing cooldown sentence, using the largest unit that applies.
 *
 * @function loginCooldownMessage
 * @description Hours when at least one hour is left, otherwise minutes, otherwise
 *              seconds. Units round up so the wait is never understated.
 *
 * @param {Date} till - Moment the cooldown ends
 * @param {number} [now] - Current timestamp in ms (default: `Date.now()`)
 *
 * @returns {string} Sentence such as "Please try to login again after 3 hours."
 */
export function loginCooldownMessage(till: Date, now = Date.now()): string {
  const ms = Math.max(0, till.getTime() - now);

  const hours = Math.ceil(ms / 3_600_000);
  if (hours >= 1) {
    return `Please try to login again after ${hours} hour${hours === 1 ? "" : "s"}.`;
  }

  const minutes = Math.ceil(ms / 60_000);
  if (minutes >= 1) {
    return `Please try to login again after ${minutes} minute${minutes === 1 ? "" : "s"}.`;
  }

  const seconds = Math.max(1, Math.ceil(ms / 1000));
  return `Please try to login again after ${seconds} second${seconds === 1 ? "" : "s"}.`;
}

/**
 * Returns the active cooldown end, or null when none is running.
 *
 * @function activeCooldown
 * @description Compares `users.cooldown_till` with the current time; an expired
 *              timestamp is treated as no cooldown.
 *
 * @param {string | Date | null | undefined} value - Raw `cooldown_till` value
 *
 * @returns {Date | null} Cooldown end when still active
 */
export function activeCooldown(
  value: string | Date | null | undefined,
): Date | null {
  const till = toDate(value);
  return till && till.getTime() > Date.now() ? till : null;
}

/**
 * Turns an active cooldown into the prefixed error the login page understands.
 *
 * @function cooldownError
 * @description Returns `${LOGIN_COOLDOWN_PREFIX}<sentence>`, or null when there is
 *              no active cooldown.
 *
 * @param {string | Date | null | undefined} value - Raw `cooldown_till` value
 *
 * @returns {string | null} Prefixed error message or null
 */
export function cooldownError(
  value: string | Date | null | undefined,
): string | null {
  const till = activeCooldown(value);
  return till
    ? `${LOGIN_COOLDOWN_PREFIX}${loginCooldownMessage(till)}`
    : null;
}

/**
 * Extracts the user-facing sentence from a prefixed cooldown error.
 *
 * @function parseCooldownError
 * @description Used by the login page on the error returned by `signIn`.
 *
 * @param {string | null | undefined} error - Error string from NextAuth
 *
 * @returns {string | null} Sentence to show, or null for other errors
 */
export function parseCooldownError(
  error: string | null | undefined,
): string | null {
  if (!error?.startsWith(LOGIN_COOLDOWN_PREFIX)) return null;
  return error.slice(LOGIN_COOLDOWN_PREFIX.length);
}
