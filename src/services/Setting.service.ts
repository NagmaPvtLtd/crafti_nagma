import type {
  DbExecutor,
  SettingResult,
  SettingRow,
} from "../types/Setting/setting.types";
import { getRedis } from "../lib/Redis/redis.config";

/* =============================================================================
 * SettingService — feature toggles
 * =============================================================================
 * Table: setting_toggle (field_name, active, save_in_redis)
 *
 *   isActive()      → check if a toggle is ON
 *   setActive()     → turn a toggle ON / OFF
 *   setSaveInRedis()→ turn Redis caching ON / OFF for a toggle
 *
 * Read flow:  Redis → MySQL → cache if save_in_redis = TRUE
 * Write flow: UPDATE MySQL → invalidate Redis key
 * ========================================================================== */

const CACHE_PREFIX = "setting_toggle:";
const CACHE_TTL_SECONDS = 60 * 60; // 1 hour

export class SettingService {
  /**
   * Check if a toggle is ON.
   * Missing field → `false` (fail-safe).
   */
  async isActive(db: DbExecutor, field_name: string): Promise<boolean> {
    if (!field_name) return false;

    const cacheKey = CACHE_PREFIX + field_name;
    const redis = getRedis();

    // 1. Cache read
    if (redis) {
      try {
        const cached = await redis.get<SettingResult>(cacheKey);
        if (cached) return cached.active;
      } catch (err) {
        console.warn("[SettingService.isActive] Redis read failed:", err);
      }
    }

    // 2. DB read
    const [rows] = await db.execute<SettingRow[]>(
      `SELECT field_name, active, save_in_redis
         FROM setting_toggle
        WHERE field_name = ?
        LIMIT 1`,
      [field_name],
    );

    if (!Array.isArray(rows) || rows.length === 0) return false;

    const row = rows[0];
    const result: SettingResult = {
      field_name: row.field_name,
      active: Boolean(row.active),
      save_in_redis: Boolean(row.save_in_redis),
    };

    // 3. Cache write (only if allowed)
    if (redis && result.save_in_redis) {
      try {
        await redis.set(cacheKey, result, { ex: CACHE_TTL_SECONDS });
      } catch (err) {
        console.warn("[SettingService.isActive] Redis write failed:", err);
      }
    }

    return result.active;
  }

  /**
   * Turn a toggle ON / OFF.
   * Also invalidates the Redis cache for that key.
   * Returns `true` if a row was updated.
   */
  async setActive(
    db: DbExecutor,
    field_name: string,
    active: boolean,
  ): Promise<boolean> {
    const [result] = await db.execute<{ affectedRows: number }>(
      `UPDATE setting_toggle
          SET active = ?
        WHERE field_name = ?`,
      [active, field_name],
    );

    const affected = (result as { affectedRows?: number })?.affectedRows ?? 0;

    if (affected > 0) {
      await this.invalidateCache(field_name);
    }

    return affected > 0;
  }

  /**
   * Turn Redis caching ON / OFF for a toggle.
   * Also invalidates the cache — turning it ON will re-cache on next read,
   * turning it OFF removes any stale entry.
   * Returns `true` if a row was updated.
   */
  async setSaveInRedis(
    db: DbExecutor,
    field_name: string,
    save_in_redis: boolean,
  ): Promise<boolean> {
    const [result] = await db.execute<{ affectedRows: number }>(
      `UPDATE setting_toggle
          SET save_in_redis = ?
        WHERE field_name = ?`,
      [save_in_redis, field_name],
    );

    const affected = (result as { affectedRows?: number })?.affectedRows ?? 0;

    if (affected > 0) {
      await this.invalidateCache(field_name);
    }

    return affected > 0;
  }

  /**
   * Delete a toggle's cached entry.
   * Internal helper — called by the setters above.
   */
  private async invalidateCache(field_name: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    try {
      await redis.del(CACHE_PREFIX + field_name);
    } catch (err) {
      console.warn(
        "[SettingService.invalidateCache] Redis delete failed:",
        err,
      );
    }
  }
}

export const setting = new SettingService();
