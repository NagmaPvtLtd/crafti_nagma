import { z } from "zod";

/* =============================================================================
 *  Setting toggle validators — single source of truth
 * =============================================================================
 *
 *  Every shape that crosses an API boundary is defined here as a Zod
 *  schema, and its TypeScript type is DERIVED via `z.infer`. Do not
 *  hand-write matching interfaces elsewhere — import the inferred type.
 *
 *  ── SHAPES ────────────────────────────────────────────────────────────────
 *
 *    fieldNameSchema          reusable primitive for field names
 *    createSettingSchema      POST /api/admin/settings  (request body)
 *    updateSettingSchema      PUT  /api/admin/settings/[fieldName]  (body)
 *    settingSchema            normalised Setting (server + client)
 *    settingResponseSchema    { setting: Setting }
 *    settingsListSchema       { settings: Setting[] }
 *
 *  ── FIELD NAME RULES ──────────────────────────────────────────────────────
 *
 *    • lowercase
 *    • starts with a letter (a–z)
 *    • only  a–z 0–9 '_' ':'
 *    • 3–100 characters
 *
 *  The ':' lets you namespace: `backend:nobody_can_login`.
 * ========================================================================== */

const FIELD_NAME_RE = /^[a-z][a-z0-9_:]{2,99}$/;
const FIELD_NAME_HINT =
  "must be lowercase, start with a letter, contain only a-z, 0-9, '_' or ':', 3–100 chars";

/* -------------------------------------------------------------------------- */
/*  Primitives                                                                 */
/* -------------------------------------------------------------------------- */

export const fieldNameSchema = z
  .string()
  .transform((v) => v.trim().toLowerCase())
  .refine((v) => FIELD_NAME_RE.test(v), { message: FIELD_NAME_HINT });

/* -------------------------------------------------------------------------- */
/*  Request bodies                                                             */
/* -------------------------------------------------------------------------- */

export const createSettingSchema = z.object({
  field_name: fieldNameSchema,
  active: z.boolean().optional().default(true),
  save_in_redis: z.boolean().optional().default(true),
});

export const updateSettingSchema = z
  .object({
    new_field_name: fieldNameSchema.optional(),
    active: z.boolean().optional(),
    save_in_redis: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.new_field_name !== undefined ||
      v.active !== undefined ||
      v.save_in_redis !== undefined,
    {
      message:
        "at least one of new_field_name, active, save_in_redis is required",
    },
  );

/* -------------------------------------------------------------------------- */
/*  Responses                                                                  */
/* -------------------------------------------------------------------------- */

/** A single setting, as returned by every endpoint. */
export const settingSchema = z.object({
  field_name: z.string(),
  active: z.boolean(),
  save_in_redis: z.boolean(),
});

/** POST/PUT response envelope: { setting } */
export const settingResponseSchema = z.object({
  setting: settingSchema,
});

/** GET response envelope: { settings: [] } */
export const settingsListResponseSchema = z.object({
  settings: z.array(settingSchema),
});

/* -------------------------------------------------------------------------- */
/*  Inferred types — import these instead of hand-writing interfaces           */
/* -------------------------------------------------------------------------- */

export type CreateSettingInput = z.infer<typeof createSettingSchema>;
export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;
export type Setting = z.infer<typeof settingSchema>;
export type SettingResponse = z.infer<typeof settingResponseSchema>;
export type SettingsListResponse = z.infer<typeof settingsListResponseSchema>;
