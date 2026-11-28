import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireRole } from "../../../../../utils/Auth/Auth.requireRole.util";
import { profileUpdateSchema } from "../../../../../utils/zod/auth.profile.zod";
import { getPool } from "../../../../../lib/Database/main.db";
import { UserRow } from "../../../../../types/User/UserRow.types";
import { getCurrentDateTime } from "../../../../../utils/ValueFetcher/getDateTime.util";
import { auditLog } from "../../../../../services/AuditLog.service";
import {
  clearPasswordAttempts,
  recordFailedPasswordAttempt,
} from "../../../../../utils/Auth/Auth.loginGuard.util";
import {
  activeCooldown,
  loginCooldownMessage,
} from "../../../../../utils/Auth/Auth.loginCooldown.util";

/* Indian mobile — same shape as the zod preprocess step, kept local so the
   backend can flip phone_verified only on a real validated number. */
/**
 * Checks whether a normalized phone string is a valid Indian mobile number
 *
 * @function isValidIndianMobile
 * @description Mirrors the zod preprocess shape locally so `phone_verified` is only set to
 *              true for a real 10-digit Indian mobile number starting with 6-9.
 *
 * @param {string} phone - Phone string without the `+91` prefix
 *
 * @returns {boolean} `true` when the value matches `^[6-9]\\d{9}$`
 */
function isValidIndianMobile(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone);
}

/* -------------------------------------------------------------------------- */
/*  POST /api/auth/profile/update                                             */
/* -------------------------------------------------------------------------- */

/**
 * Updates the signed-in customer's profile, including an optional password change.
 *
 * @async
 * @function POST
 * @description Validates the body with `profileUpdateSchema` (required name, phone, address,
 *              city, state and 6-digit pincode; company, GSTIN and password are optional) and
 *              writes the caller's own `users` row. `profile_completed` is computed from
 *              every mandatory profile field and is only true when all are filled.
 *              A password change requires the current password when one already exists, is
 *              compared with bcrypt, and is stored as a bcrypt hash with cost 12.
 *              A password change revokes the account's other device sessions and keeps
 *              the current device signed in.
 *              `phone_verified` becomes true only for a valid new Indian mobile, false when the
 *              phone is cleared, and otherwise keeps its stored value.
 *
 * @param {NextRequest} req - The incoming HTTP request with a JSON body
 * @body {string} first_name - First name (1-100 chars)
 * @body {string} last_name - Last name (1-100 chars)
 * @body {string} phone - `+91` mobile, 6-9 followed by 9 digits; stored without the prefix
 * @body {string} address_line_1 - Address line 1 (1-255 chars)
 * @body {string} address_line_2 - Address line 2 (1-255 chars)
 * @body {string} landmark - Landmark (1-255 chars)
 * @body {string} city - City (1-100 chars)
 * @body {string} state - State (1-100 chars)
 * @body {string} postal_code - 6-digit Indian pincode, first digit 1-9
 * @body {string} [company_name] - Company name (optional, max 255, default: "")
 * @body {string} [gstin] - GSTIN (optional, uppercased, 15-char GSTIN pattern, default: "")
 * @body {string} [currentPassword] - Required when changing a password that already exists
 * @body {string} [newPassword] - New password (min 8 chars when any password field is set)
 * @body {string} [confirmPassword] - Must match `newPassword`
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true` once the profile is saved
 *
 * @throws {400} `invalid_input` (schema details), `current_password_required`,
 *               `invalid_current_password`
 * @throws {429} Password verification cooldown with `Retry-After`
 * @throws {401} Unauthorized - No session, role below customer, or session without a user id
 * @throws {403} Forbidden - Account not active or no role assigned
 * @throws {404} `user_not_found` - The session id no longer exists in `users`
 * @throws {500} `server_error` - Database failure while reading or updating `users`
 *
 * @description Workflow:
 *   1. Initialize the customer guard (session, active status, role rank)
 *   2. Read the trusted user id from the session and return 401 when it is missing
 *   3. Parse the JSON body and validate it with `profileUpdateSchema`
 *   4. Initialize the database pool and take a connection
 *   5. Load the stored `password_hash`, `phone` and `phone_verified`, returning 404 if absent
 *   6. When a new password is set: require the current password if a hash exists, enforce
 *      the shared cooldown, verify with `bcrypt.compare`, record failures, then hash the
 *      new one with `bcrypt.hash(..., 12)`
 *   7. Derive `full_name` from first and last name
 *   8. Derive `phone_verified`: true for a valid Indian mobile, false when cleared, else keep
 *   9. Timestamp the update with `getCurrentDateTime`
 *   10. Update the profile columns on `users` (empty values stored as `NULL`)
 *   11. On a password change, delete every other row from `user_sessions` while keeping
 *       the current device's row; a legacy token without a session id clears them all
 *   12. Write an UPDATE / USER audit entry listing the changed `phone` / `password` fields,
 *       swallowing any audit error
 *   13. Return 200 response with `{ ok: true }`
 *   14. Release the connection in `finally`
 */
export async function POST(req: NextRequest) {
  /* ---- auth ---- */
  const guard = await requireRole(["customer"], {
    label: "POST /api/auth/profile/update",
  });
  if (!guard.ok) return guard.response;

  const userId = guard.session.user.id;
  if (!userId) {
    console.warn("[PROFILE - UPDATE] ✕ session has no user id");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  /* ---- input ---- */
  const json = await req.json().catch(() => null);
  const parsed = profileUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_input",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const data = parsed.data;

  /* ---- db ---- */
  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    /* ---- fetch current user ---- */
    const [rows] = await conn.query<UserRow[]>(
      `SELECT id, password_hash, phone, phone_verified, cooldown_till
         FROM users
        WHERE id = ?
        LIMIT 1`,
      [userId],
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    }

    const dbUser = rows[0];

    /* ---- password change (optional) ---- */
    let passwordHash = dbUser.password_hash;
    const wantsPasswordChange = Boolean(data.newPassword);

    if (wantsPasswordChange) {
      if (dbUser.password_hash) {
        if (!data.currentPassword) {
          return NextResponse.json(
            { error: "current_password_required" },
            { status: 400 },
          );
        }

        const cooldownTill = activeCooldown(dbUser.cooldown_till);
        if (cooldownTill) {
          return NextResponse.json(
            { error: loginCooldownMessage(cooldownTill) },
            {
              status: 429,
              headers: {
                "Retry-After": String(
                  Math.max(
                    1,
                    Math.ceil((cooldownTill.getTime() - Date.now()) / 1000),
                  ),
                ),
              },
            },
          );
        }

        const ok = await bcrypt.compare(
          data.currentPassword,
          dbUser.password_hash,
        );
        if (!ok) {
          const result = await recordFailedPasswordAttempt(conn, dbUser.id);
          if (result?.cooldownTill) {
            return NextResponse.json(
              { error: loginCooldownMessage(result.cooldownTill) },
              {
                status: 429,
                headers: {
                  "Retry-After": String(
                    Math.max(
                      1,
                      Math.ceil(
                        (result.cooldownTill.getTime() - Date.now()) / 1000,
                      ),
                    ),
                  ),
                },
              },
            );
          }
          return NextResponse.json(
            { error: "invalid_current_password" },
            { status: 400 },
          );
        }

        await clearPasswordAttempts(conn, dbUser.id);
      }
      passwordHash = await bcrypt.hash(data.newPassword!, 12);
    }

    /* ---- derived fields ---- */
    const fullName = `${data.first_name} ${data.last_name}`.trim();

    /* phone_verified: only flip TRUE when the phone is a valid Indian
       mobile AND it changed to a new valid number. If the phone is
       cleared, reset to FALSE. */
    const phoneChanged = (dbUser.phone ?? "") !== data.phone;
    const phoneIsValid = data.phone !== "" && isValidIndianMobile(data.phone);

    const phoneVerified = phoneIsValid
      ? true
      : data.phone === ""
        ? false
        : Boolean(dbUser.phone_verified);

    const profileCompleted = [
      data.first_name,
      data.last_name,
      data.phone,
      data.address_line_1,
      data.address_line_2,
      data.landmark,
      data.city,
      data.state,
      data.postal_code,
    ].every((value) => value.trim().length > 0);

    const now = getCurrentDateTime();

    /* ---- update ---- */
    await conn.query(
      `UPDATE users
          SET first_name        = ?,
              last_name         = ?,
              full_name         = ?,
              phone             = ?,
              phone_verified    = ?,
              address_line_1    = ?,
              address_line_2    = ?,
              landmark          = ?,
              city              = ?,
              state             = ?,
              postal_code       = ?,
              company_name      = ?,
              gstin             = ?,
              password_hash     = ?,
              profile_completed = ?,
              updated_at        = ?
        WHERE id = ?`,
      [
        data.first_name,
        data.last_name || null,
        fullName || null,
        data.phone || null,
        phoneVerified,
        data.address_line_1 || null,
        data.address_line_2 || null,
        data.landmark || null,
        data.city || null,
        data.state || null,
        data.postal_code || null,
        data.company_name || null,
        data.gstin || null,
        passwordHash,
        profileCompleted,
        now,
        dbUser.id,
      ],
    );

    if (wantsPasswordChange) {
      const currentSessionId = guard.session.user.session_id;
      if (currentSessionId) {
        await conn.query(
          `DELETE FROM user_sessions
            WHERE user_id = ? AND session_id <> ?`,
          [dbUser.id, currentSessionId],
        );
      } else {
        await conn.query(`DELETE FROM user_sessions WHERE user_id = ?`, [
          dbUser.id,
        ]);
      }
    }

    /* ---- audit ---- */
    try {
      const changes: string[] = [];
      if (phoneChanged) changes.push("phone");
      if (wantsPasswordChange)
        changes.push(dbUser.password_hash ? "password" : "password (set)");

      await auditLog.log(pool, {
        userId: dbUser.id,
        action: "UPDATE",
        entityType: "USER",
        description: `Profile updated. [id=${dbUser.id}${
          changes.length ? `, changed=${changes.join(",")}` : ""
        }]`,
      });
    } catch {
      /* audit must never break the response */
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PROFILE - UPDATE]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  } finally {
    conn.release();
  }
}
