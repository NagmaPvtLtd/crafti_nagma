import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "../[...nextauth]/route";
import { getPool } from "../../../../lib/Database/main.db";
import { UserRow } from "../../../../types/User/UserRow.types";
import { getCurrentDateTime } from "../../../../utils/ValueFetcher/getDateTime.util";
import { auditLog } from "../../../../services/AuditLog.service";
import { authSetPasswordSchema } from "../../../../utils/zod/auth.setPassword.zod";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const json = await req.json().catch(() => null);
    const parsed = authSetPasswordSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { currentPassword, newPassword } = parsed.data;
    const pool = await getPool();

    const [rows] = await pool.execute<UserRow[]>(
      `SELECT id, password_hash FROM users WHERE id = ? LIMIT 1`,
      [session.user.id],
    );
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    }

    const dbUser = rows[0];

    // If a password already exists, require the old one before allowing change.
    if (dbUser.password_hash) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "current_password_required" },
          { status: 400 },
        );
      }
      const ok = await bcrypt.compare(currentPassword, dbUser.password_hash);
      if (!ok) {
        return NextResponse.json(
          { error: "invalid_current_password" },
          { status: 400 },
        );
      }
    }

    const hash = await bcrypt.hash(newPassword, 12);
    const now = getCurrentDateTime();

    await pool.execute(
      `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`,
      [hash, now, dbUser.id],
    );

    try {
      await auditLog.log(pool, {
        userId: dbUser.id,
        action: "UPDATE",
        entityType: "USER",
        description: dbUser.password_hash
          ? `Password changed. [id=${dbUser.id}]`
          : `Password set (was Google-only). [id=${dbUser.id}]`,
      });
    } catch {
      /* ignore audit errors */
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[SET-PASSWORD]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
