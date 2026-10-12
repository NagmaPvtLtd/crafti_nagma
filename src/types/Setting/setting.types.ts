import type { Pool, RowDataPacket } from "mysql2/promise";
import type {
  Setting,
  UpdateSettingInput,
} from "../../utils/zod/setting.validator.zod";

/* =============================================================================
 *  Setting types — DB-only concerns
 * =============================================================================
 *
 *  Everything that crosses an API boundary lives in the Zod file and is
 *  inferred from there. This file only holds:
 *
 *    • DbExecutor        — mysql2 query signature
 *    • SettingRow        — mysql2 row constraint (extends RowDataPacket)
 *    • re-exported types — so existing imports don't have to chase paths
 * ========================================================================== */

/* -------------------------------------------------------------------------- */
/*  DB executor                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Anything that can run a parameterised query.
 *
 * `Pick` from `Pool` so the signature matches mysql2 exactly — a `Pool`,
 * `PoolConnection`, or transaction handle all satisfy this without casts.
 * Only `query` is exposed so call sites stay consistent.
 */
export type DbExecutor = Pick<Pool, "query">;

/* -------------------------------------------------------------------------- */
/*  Raw mysql2 row                                                     */
/* -------------------------------------------------------------------------- */

/**
 * mysql2 constrains the generic on `query<T>` to types extending
 * `RowDataPacket`. This is the ONLY hand-written interface in the whole
 * feature — every other shape is inferred from Zod.
 */
export interface SettingRow extends RowDataPacket {
  field_name: string;
  active: boolean | number;
  save_in_redis: boolean | number;
}

/* -------------------------------------------------------------------------- */
/*  Re-exports                                                         */
/* -------------------------------------------------------------------------- */

/** Normalised setting — inferred from `settingSchema`. */
export type SettingResult = Setting;

/** Update payload — inferred from `updateSettingSchema`. */
export type SettingPatch = UpdateSettingInput;
