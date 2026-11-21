import { NextResponse } from "next/server";
import { requireRole } from "../../../../utils/Auth/Auth.requireRole.util";
import { getPool } from "../../../../lib/Database/main.db";
import { UserRow } from "../../../../types/User/UserRow.types";
import { ProfileResponse } from "../../../../types/User/ProfileClient.types";

/* -------------------------------------------------------------------------- */
/*  GET /api/auth/profile                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Returns the signed-in customer's profile.
 *
 * @async
 * @function GET
 * @description Customer-only read of the caller's own `users` row, selected by the trusted
 *              session id. `password_hash` is never returned; it is only used to derive the
 *              `has_password` flag. Missing columns fall back to empty strings, and `country`
 *              falls back to "India".
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - id: the user id
 *   - first_name, last_name, full_name: name fields (empty string when null)
 *   - email: the account email
 *   - phone: phone number (empty string when null)
 *   - email_verified, phone_verified: verification flags as booleans
 *   - has_password: `true` when `password_hash` is set
 *   - address_line_1, address_line_2, landmark, city, state, postal_code: address fields
 *   - country: country (defaults to "India")
 *   - company_name, gstin: business fields (empty string when null)
 *   - image: `google_profile_picture` or `null`
 *
 * @throws {401} Unauthorized - No session, role below customer, or session without a user id
 * @throws {403} Forbidden - Account not active or no role assigned
 * @throws {404} `user_not_found` - The session id no longer exists in `users`
 * @throws {500} `server_error` - Database failure while reading `users`
 *
 * @description Workflow:
 *   1. Initialize the customer guard (session, active status, role rank)
 *   2. Read the trusted user id from the session and return 401 when it is missing
 *   3. Initialize the database pool and take a connection
 *   4. Select the profile columns from `users` for that id
 *   5. Return 404 when the row no longer exists
 *   6. Map the row into `ProfileResponse` (nulls to empty strings, flags to booleans)
 *   7. Return 200 response with the profile payload
 *   8. Release the connection in `finally`
 */
export async function GET() {
  const guard = await requireRole(["customer"], {
    label: "GET /api/auth/profile",
  });
  if (!guard.ok) return guard.response;

  const userId = guard.session.user.id;
  if (!userId) {
    console.warn("[PROFILE - GET] ✕ session has no user id");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query<UserRow[]>(
      `SELECT id, first_name, last_name, full_name, email,
              phone, email_verified, phone_verified,
              password_hash,
              address_line_1, address_line_2, landmark,
              city, state, postal_code, country,
              company_name, gstin,
              google_profile_picture
         FROM users
        WHERE id = ?
        LIMIT 1`,
      [userId],
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    }

    const row = rows[0];

    const payload: ProfileResponse = {
      id: row.id,
      first_name: row.first_name ?? "",
      last_name: row.last_name ?? "",
      full_name: row.full_name ?? "",
      email: row.email,
      phone: row.phone ?? "",
      email_verified: Boolean(row.email_verified),
      phone_verified: Boolean(row.phone_verified),
      has_password: Boolean(row.password_hash),
      address_line_1: row.address_line_1 ?? "",
      address_line_2: row.address_line_2 ?? "",
      landmark: row.landmark ?? "",
      city: row.city ?? "",
      state: row.state ?? "",
      postal_code: row.postal_code ?? "",
      country: row.country ?? "India",
      company_name: row.company_name ?? "",
      gstin: row.gstin ?? "",
      image: row.google_profile_picture ?? null,
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error("[PROFILE - GET]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  } finally {
    conn.release();
  }
}
