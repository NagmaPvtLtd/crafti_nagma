import type {
  DbExecutor,
  SettingPatch,
  SettingResult,
  SettingRow,
} from "../types/Setting/setting.types";
import { getRedis } from "../lib/Redis/redis.config";
import { getDBName } from "../utils/ValueFetcher/getDBName.util";

/* =============================================================================
 * SettingService — feature toggles
 * =============================================================================
 * Table: setting_toggle (field_name, active, save_in_redis)
 *
 * Every Redis-cached setting lives in ONE object under a single key,
 * namespaced by database name so dev/staging/prod never collide:
 *
 *     `${getDbName()}:setting_toggle:cache`  →  { [field_name]: SettingResult }
 *
 * Only fields with `save_in_redis = TRUE` are stored in that map.
 *
 * Public API:
 *   isActive(db, field_name)                    → boolean
 *   create(db, field_name, active, saveInRedis) → SettingResult
 *   update(db, original, patch)                 → SettingResult | null
 *   remove(db, field_name)                      → boolean
 *   setActive(db, field_name, bool)             → boolean
 *   setSaveInRedis(db, field_name, bool)        → boolean
 * ========================================================================== */

const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_SUFFIX = "setting_toggle:cache";

function cacheKey(): string {
  return `${getDBName()}:${CACHE_SUFFIX}`;
}

type SettingMap = Record<string, SettingResult>;

export class SettingService {
  /* ---------------- Read ---------------- */

  async isActive(db: DbExecutor, field_name: string): Promise<boolean> {
    if (!field_name) return false;

    const redis = getRedis();
    const key = cacheKey();

    if (redis) {
      try {
        const cache = await redis.get<SettingMap>(key);

        if (cache && Object.prototype.hasOwnProperty.call(cache, field_name)) {
          return cache[field_name].active;
        }

        if (cache) {
          const row = await this.loadOne(db, field_name);
          if (!row) return false;

          if (row.save_in_redis) {
            const merged: SettingMap = { ...cache, [field_name]: row };
            await redis.set(key, merged, { ex: CACHE_TTL_SECONDS });
          }
          return row.active;
        }
      } catch (err) {
        console.warn("[SettingService.isActive] Redis read failed:", err);
      }
    }

    const rows = await this.loadAll(db);
    const hit = rows.find((r) => r.field_name === field_name);

    if (redis) {
      const map: SettingMap = {};
      for (const r of rows) if (r.save_in_redis) map[r.field_name] = r;
      try {
        await redis.set(key, map, { ex: CACHE_TTL_SECONDS });
      } catch (err) {
        console.warn("[SettingService.isActive] Redis write failed:", err);
      }
    }

    return hit?.active ?? false;
  }

  /* ---------------- Create ---------------- */

  async create(
    db: DbExecutor,
    field_name: string,
    active: boolean,
    save_in_redis: boolean,
  ): Promise<SettingResult> {
    await db.query(
      `INSERT INTO setting_toggle (field_name, active, save_in_redis)
       VALUES (?, ?, ?)`,
      [field_name, active, save_in_redis],
    );

    const created: SettingResult = { field_name, active, save_in_redis };
    if (save_in_redis) await this.mergeIntoCache(field_name, created);
    return created;
  }

  /* ---------------- Update ---------------- */

  async update(
    db: DbExecutor,
    original: string,
    patch: SettingPatch,
  ): Promise<SettingResult | null> {
    const before = await this.loadOne(db, original);
    if (!before) return null;

    const nextName = patch.new_field_name ?? original;
    const nextActive = patch.active ?? before.active;
    const nextRedis = patch.save_in_redis ?? before.save_in_redis;

    await db.query(
      `UPDATE setting_toggle
          SET field_name = ?, active = ?, save_in_redis = ?
        WHERE field_name = ?`,
      [nextName, nextActive, nextRedis, original],
    );

    const after: SettingResult = {
      field_name: nextName,
      active: nextActive,
      save_in_redis: nextRedis,
    };

    if (nextName !== original) await this.removeFromCache(original);
    if (nextRedis) await this.mergeIntoCache(nextName, after);
    else await this.removeFromCache(nextName);

    return after;
  }

  /* ---------------- Delete ---------------- */

  async remove(db: DbExecutor, field_name: string): Promise<boolean> {
    const [result] = await db.query(
      `DELETE FROM setting_toggle WHERE field_name = ?`,
      [field_name],
    );
    const affected = (result as { affectedRows?: number })?.affectedRows ?? 0;
    if (affected > 0) await this.removeFromCache(field_name);
    return affected > 0;
  }

  /* ---------------- Field setters ---------------- */

  async setActive(
    db: DbExecutor,
    field_name: string,
    active: boolean,
  ): Promise<boolean> {
    return (await this.update(db, field_name, { active })) !== null;
  }

  async setSaveInRedis(
    db: DbExecutor,
    field_name: string,
    save_in_redis: boolean,
  ): Promise<boolean> {
    return (await this.update(db, field_name, { save_in_redis })) !== null;
  }

  /* ---------------- Internal: DB ---------------- */

  private async loadAll(db: DbExecutor): Promise<SettingResult[]> {
    const [rows] = await db.query<SettingRow[]>(
      `SELECT field_name, active, save_in_redis FROM setting_toggle`,
    );
    if (!Array.isArray(rows)) return [];
    return rows.map((r) => ({
      field_name: r.field_name,
      active: Boolean(r.active),
      save_in_redis: Boolean(r.save_in_redis),
    }));
  }

  private async loadOne(
    db: DbExecutor,
    field_name: string,
  ): Promise<SettingResult | null> {
    const [rows] = await db.query<SettingRow[]>(
      `SELECT field_name, active, save_in_redis
         FROM setting_toggle
        WHERE field_name = ? LIMIT 1`,
      [field_name],
    );
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const r = rows[0];
    return {
      field_name: r.field_name,
      active: Boolean(r.active),
      save_in_redis: Boolean(r.save_in_redis),
    };
  }

  /* ---------------- Internal: cache map ---------------- */

  private async mergeIntoCache(
    field_name: string,
    row: SettingResult,
  ): Promise<void> {
    const redis = getRedis();
    if (!redis) return;
    const key = cacheKey();
    try {
      const cache = (await redis.get<SettingMap>(key)) ?? {};
      cache[field_name] = row;
      await redis.set(key, cache, { ex: CACHE_TTL_SECONDS });
    } catch (err) {
      console.warn("[SettingService.mergeIntoCache] Redis write failed:", err);
    }
  }

  private async removeFromCache(field_name: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;
    const key = cacheKey();
    try {
      const cache = await redis.get<SettingMap>(key);
      if (!cache || !cache[field_name]) return;
      delete cache[field_name];
      await redis.set(key, cache, { ex: CACHE_TTL_SECONDS });
    } catch (err) {
      console.warn("[SettingService.removeFromCache] Redis write failed:", err);
    }
  }
}

export const setting = new SettingService();
