import type { PoolConnection } from "mysql2/promise";

import { getRedis } from "../../lib/Redis/redis.config";
import { formatSqlDateTime } from "../ValueFetcher/getDateTime.util";
import {
  LOGIN_COOLDOWN_MS,
  MAX_FAILED_PASSWORD_ATTEMPTS,
} from "./Auth.loginCooldown.util";

const failureKey = (userId: string) => `auth:password-fail:${userId}`;

/**
 * Increments the consecutive wrong-password counter for a user.
 *
 * @function countFailedPassword
 * @description Uses a Redis key with a 24-hour TTL, so an abandoned streak expires
 *              on its own. Redis failures are logged and treated as "not counted"
 *              rather than blocking sign-in.
 *
 * @param {string} userId - `users.id`
 *
 * @returns {Promise<number | null>} New attempt count, or null when Redis failed
 */
export async function countFailedPassword(
  userId: string,
): Promise<number | null> {
  try {
    const redis = getRedis();
    const key = failureKey(userId);
    const attempts = await redis.incr(key);
    if (attempts === 1) {
      await redis.expire(key, Math.ceil(LOGIN_COOLDOWN_MS / 1000));
    }
    return Number(attempts);
  } catch (err) {
    console.error(
      "[AUTH - COOLDOWN] Redis unavailable, failed attempt not counted:",
      err,
    );
    return null;
  }
}

/**
 * Clears the consecutive wrong-password counter.
 *
 * @function clearFailedPassword
 * @description Called after a successful password sign-in and when a cooldown
 *              starts, so the next streak begins from zero.
 *
 * @param {string} userId - `users.id`
 *
 * @returns {Promise<void>} Resolves even when Redis is unavailable
 */
export async function clearFailedPassword(userId: string): Promise<void> {
  try {
    await getRedis().del(failureKey(userId));
  } catch (err) {
    console.error("[AUTH - COOLDOWN] Could not clear the counter:", err);
  }
}

/**
 * Starts a 24-hour cooldown once the attempt threshold is reached.
 *
 * @function applyCooldownIfNeeded
 * @description Writes `users.cooldown_till` and clears the Redis counter. Returns
 *              null when the attempt count is below the threshold.
 *
 * @param {PoolConnection} conn - Connection used for the `users` update
 * @param {string} userId - `users.id`
 * @param {number | null} attempts - Result of `countFailedPassword`
 *
 * @returns {Promise<Date | null>} Cooldown end when one just started
 */
export async function applyCooldownIfNeeded(
  conn: PoolConnection,
  userId: string,
  attempts: number | null,
): Promise<Date | null> {
  if (attempts === null || attempts < MAX_FAILED_PASSWORD_ATTEMPTS) {
    return null;
  }

  const till = new Date(Date.now() + LOGIN_COOLDOWN_MS);
  await conn.execute(`UPDATE users SET cooldown_till = ? WHERE id = ?`, [
    formatSqlDateTime(till),
    userId,
  ]);
  await clearFailedPassword(userId);

  return till;
}
