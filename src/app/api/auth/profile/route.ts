import { NextResponse } from "next/server";
import { requireRole } from "../../../../utils/Auth/Auth.requireRole.util";
import { getPool } from "../../../../lib/Database/main.db";
import { UserRow } from "../../../../types/User/UserRow.types";
import { ProfileResponse } from "../../../../types/User/ProfileClient.types";

/* -------------------------------------------------------------------------- */
/*  GET /api/auth/profile                                                     */
/* -------------------------------------------------------------------------- */

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
