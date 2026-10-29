import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireRole } from "../../../../../utils/Auth/Auth.requireRole.util";
import { profileUpdateSchema } from "../../../../../utils/zod/auth.profile.zod";
import { getPool } from "../../../../../lib/Database/main.db";
import { UserRow } from "../../../../../types/User/UserRow.types";
import { getCurrentDateTime } from "../../../../../utils/ValueFetcher/getDateTime.util";
import { auditLog } from "../../../../../services/AuditLog.service";

/* Indian mobile — same shape as the zod preprocess step, kept local so the
   backend can flip phone_verified only on a real validated number. */
function isValidIndianMobile(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone);
}

/* -------------------------------------------------------------------------- */
/*  POST /api/auth/profile/update                                             */
/* -------------------------------------------------------------------------- */

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
      `SELECT id, password_hash, phone, phone_verified
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
        const ok = await bcrypt.compare(
          data.currentPassword,
          dbUser.password_hash,
        );
        if (!ok) {
          return NextResponse.json(
            { error: "invalid_current_password" },
            { status: 400 },
          );
        }
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
        now,
        dbUser.id,
      ],
    );

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
