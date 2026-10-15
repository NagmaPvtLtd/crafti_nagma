import type {
  DbExecutor,
  SettingPatch,
  SettingResult,
  SettingRow,
} from "../types/Setting/setting.types";
import { getRedis } from "../lib/Redis/redis.config";
import { RedisKeyService } from "./RedisKey.service";

/* =============================================================================
 *  SettingService — feature toggles
 * =============================================================================
 *
 *  Backing table: `setting_toggle (field_name, active, save_in_redis)`.
 *
 *  Cache layout
 *  ------------
 *
 *  All toggles live in a single Redis hash-like object under the key
 *  returned by `RedisKeyService.settingsKey()`. The key is namespaced by
 *  database name and environment, so dev, staging, and prod never collide
 *  even when sharing one Redis instance:
 *
 *      { [field_name]: SettingResult }
 *
 *  Only rows with `save_in_redis = TRUE` are stored in that map. Fields
 *  with `save_in_redis = FALSE` always read fresh from MySQL. The TTL is
 *  also managed by `RedisKeyService.settingsKey()` so cache lifetime can
 *  be tuned in one place.
 *
 *  Read path
 *  ---------
 *
 *    Redis map present, field present   → return its value.
 *    Redis map present, field absent    → single-row DB lookup; merge the
 *                                         row into the map if it is
 *                                         cacheable.
 *    Redis map cold                     → full DB load, rebuild map from
 *                                         cacheable rows, return value.
 *    Field absent everywhere            → false (fail-safe).
 *
 *  Write path
 *  ----------
 *
 *    create()           INSERT → merge into map if cacheable.
 *    update()           UPDATE → drop old name if renamed; merge or drop
 *                                the new entry based on save_in_redis.
 *    remove()           DELETE → drop from map if a row was deleted.
 *    setActive()        thin wrapper over update().
 *    setSaveInRedis()   thin wrapper over update().
 *
 *  Failure behaviour
 *  -----------------
 *
 *    Redis read/write throws   → logged, falls back to DB (reads) or
 *                                silently succeeds (writes).
 *    Redis unavailable         → every path proceeds without caching.
 *    Row missing               → isActive returns false; update and remove
 *                                return null / false.
 * ========================================================================== */

type SettingMap = Record<string, SettingResult>;

export class SettingService {
  /* ------------------------------------------------------------------ */
  /*  Read                                                              */
  /* ------------------------------------------------------------------ */

  /**
   * Checks whether a toggle is currently ON.
   *
   * Consulted from feature-gate call sites — for example the NextAuth
   * `signIn` callback — where the result must be cheap and must never
   * throw. A missing field returns `false`, so a deleted or renamed row
   * behaves like a disabled feature rather than crashing the caller.
   *
   * @param db          A query executor (pool or connection).
   * @param field_name  The toggle name, e.g. `backend:nobody_can_login`.
   * @returns           `true` if the toggle exists and is active.
   */
  async isActive(db: DbExecutor, field_name: string): Promise<boolean> {
    if (!field_name) return false;

    const redis = getRedis();
    const { redis_key: key, redis_ttl: ttl } = RedisKeyService.settingsKey();

    /* ---- Cache hit path -------------------------------------------- */
    if (redis) {
      try {
        const cache = await redis.get<SettingMap>(key);

        if (cache && Object.prototype.hasOwnProperty.call(cache, field_name)) {
          return cache[field_name].active;
        }

        /* ---- Cache present but field missing --------------------- */
        /* The field either has save_in_redis = FALSE or does not exist.
           Do a targeted DB lookup and cache the result only if allowed. */
        if (cache) {
          const row = await this.loadOne(db, field_name);
          if (!row) return false;

          if (row.save_in_redis) {
            const merged: SettingMap = { ...cache, [field_name]: row };
            await redis.set(key, merged, { ex: ttl });
          }
          return row.active;
        }
      } catch (err) {
        console.warn("[SETTING - READ] ✕ Redis read failed :", err);
      }
    }

    /* ---- Cache cold path ------------------------------------------- */
    const rows = await this.loadAll(db);
    const hit = rows.find((r) => r.field_name === field_name);

    if (redis) {
      const map: SettingMap = {};
      for (const r of rows) if (r.save_in_redis) map[r.field_name] = r;
      try {
        await redis.set(key, map, { ex: ttl });
      } catch (err) {
        console.warn("[SETTING - WRITE] ✕ Redis write failed :", err);
      }
    }

    return hit?.active ?? false;
  }

  /* ------------------------------------------------------------------ */
  /*  Create                                                            */
  /* ------------------------------------------------------------------ */

  /**
   * Inserts a new toggle and, when the row is marked cacheable, adds it
   * to the Redis map immediately. This makes the new toggle visible to
   * the very next `isActive` call without waiting for a cache miss.
   *
   * @returns The normalised `SettingResult` that was written.
   */
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

  /* ------------------------------------------------------------------ */
  /*  Update                                                            */
  /* ------------------------------------------------------------------ */

  /**
   * Updates one or more fields on an existing toggle, with optional
   * rename support.
   *
   * Cache reconciliation:
   *
   *   1. If the name changed, the old entry is removed from the map.
   *   2. If the resulting `save_in_redis` is TRUE, the new entry is
   *      merged into the map.
   *   3. If the resulting `save_in_redis` is FALSE, the entry is dropped
   *      from the map (it should never have been there).
   *
   * @returns The updated `SettingResult`, or `null` if the row was not
   *          found.
   */
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

  /* ------------------------------------------------------------------ */
  /*  Delete                                                            */
  /* ------------------------------------------------------------------ */

  /**
   * Permanently removes a toggle and drops it from the Redis map.
   *
   * @returns `true` if a row was deleted, `false` otherwise.
   */
  async remove(db: DbExecutor, field_name: string): Promise<boolean> {
    const [result] = await db.query(
      `DELETE FROM setting_toggle WHERE field_name = ?`,
      [field_name],
    );

    const affected = (result as { affectedRows?: number })?.affectedRows ?? 0;

    if (affected > 0) await this.removeFromCache(field_name);

    return affected > 0;
  }

  /* ------------------------------------------------------------------ */
  /*  Field-level setters                                               */
  /* ------------------------------------------------------------------ */

  /**
   * Turns a toggle ON or OFF.
   * Thin wrapper over `update`; all cache-sync logic lives there.
   *
   * @returns `true` if the row existed and was updated.
   */
  async setActive(
    db: DbExecutor,
    field_name: string,
    active: boolean,
  ): Promise<boolean> {
    return (await this.update(db, field_name, { active })) !== null;
  }

  /**
   * Turns Redis caching ON or OFF for a toggle.
   * Thin wrapper over `update`; all cache-sync logic lives there.
   *
   * @returns `true` if the row existed and was updated.
   */
  async setSaveInRedis(
    db: DbExecutor,
    field_name: string,
    save_in_redis: boolean,
  ): Promise<boolean> {
    return (await this.update(db, field_name, { save_in_redis })) !== null;
  }

  /* ------------------------------------------------------------------ */
  /*  Internal — database                                               */
  /* ------------------------------------------------------------------ */

  /** Loads every toggle from MySQL, normalised to booleans. */
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

  /** Loads a single toggle by name. Returns `null` if not found. */
  private async loadOne(
    db: DbExecutor,
    field_name: string,
  ): Promise<SettingResult | null> {
    const [rows] = await db.query<SettingRow[]>(
      `SELECT field_name, active, save_in_redis
         FROM setting_toggle
        WHERE field_name = ?
        LIMIT 1`,
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

  /* ------------------------------------------------------------------ */
  /*  Internal — Redis map                                              */
  /* ------------------------------------------------------------------ */

  /**
   * Adds or replaces a single field in the Redis map.
   * No-op when Redis is unavailable; failures are logged but never
   * propagate to the caller.
   */
  private async mergeIntoCache(
    field_name: string,
    row: SettingResult,
  ): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    const { redis_key: key, redis_ttl: ttl } = RedisKeyService.settingsKey();

    try {
      const cache = (await redis.get<SettingMap>(key)) ?? {};
      cache[field_name] = row;
      await redis.set(key, cache, { ex: ttl });
    } catch (err) {
      console.warn("[SETTING - MERGE] ✕ Redis write failed :", err);
    }
  }

  /**
   * Removes a single field from the Redis map.
   * No-op when Redis is unavailable, when the map is cold, or when the
   * field is not present.
   */
  private async removeFromCache(field_name: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    const { redis_key: key, redis_ttl: ttl } = RedisKeyService.settingsKey();

    try {
      const cache = await redis.get<SettingMap>(key);
      if (!cache || !cache[field_name]) return;

      delete cache[field_name];
      await redis.set(key, cache, { ex: ttl });
    } catch (err) {
      console.warn("[SETTING - REMOVE] ✕ Redis write failed :", err);
    }
  }
}

export const setting = new SettingService();
