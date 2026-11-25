import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";

import { getPool } from "../../../../../lib/Database/main.db";
import { requireAdmin } from "../../../../../utils/Auth/Auth.requireRole.util";
import { auditLog } from "../../../../../services/AuditLog.service";
import { getCurrentDateTime } from "../../../../../utils/ValueFetcher/getDateTime.util";
import { invalidInput } from "../../../../../utils/Api/apiResponse.util";
import { userRoleUpdateSchema } from "../../../../../utils/zod/admin/userManager.zod";
import type {
  UserRole,
  UserStatus,
} from "../../../../../types/User/UserRow.types";

interface TargetRow extends RowDataPacket {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

interface CountRow extends RowDataPacket {
  total: number;
}

const USER_NAME_EXPR =
  "COALESCE(u.full_name, CONCAT_WS(' ', u.first_name, u.last_name), u.email)";

/**
 * Changes the role of the given user, which is how staff access is granted or removed.
 *
 * @async
 * @function PATCH
 * @description Replaces `users.role` for the `userId` in the path behind the admin guard.
 *              A user cannot change their own role. Only a super admin may touch an
 *              existing admin or super admin, and only a super admin may promote someone
 *              to super admin. The last remaining super admin cannot be demoted. The
 *              change writes `updated_at` with `getCurrentDateTime` and records a
 *              `ROLE_CHANGED` entry in `audit_logs`.
 *
 * @param {NextRequest} req - The incoming HTTP request with a JSON body
 * @param {Object} context - Next.js route context
 * @param {Promise<{ userId: string }>} context.params - Route parameters (`(await context.params).userId`)
 *
 * @body {string} role - New role; one of `customer`, `manager`, `admin`, `super_admin`
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - message: human-readable result ("Role updated" or "Role unchanged")
 *   - user: `id`, `name`, `email`, `role` and `status` after the change
 *
 * @throws {400} Validation failed - body is not JSON, `role` missing, or `userId` is not 10-40 characters
 * @throws {401} Unauthorized - No session
 * @throws {403} Forbidden - Caller below admin, or a non super admin touching an admin-level account
 * @throws {404} User not found
 * @throws {409} Self role change, or demoting the last super admin
 * @throws {500} Database failure while reading or updating `users`
 *
 * @description Workflow:
 *   1. Initialize the admin guard (session, active status, role rank)
 *   2. Read and trim `userId`; reject anything outside 10-40 characters
 *   3. Parse the JSON body and validate it with `userRoleUpdateSchema`
 *   4. Refuse a change to the caller's own role with 409
 *   5. Initialize the database pool
 *   6. Load the target row (`id`, name, email, `role`, `status`); 404 when missing
 *   7. Return early with "Role unchanged" when the role already matches
 *   8. Refuse a non super admin changing an admin or super admin with 403
 *   9. Refuse a non super admin promoting anyone to super admin with 403
 *   10. Count super admins and refuse demoting the last one with 409
 *   11. Update `users.role` and `users.updated_at`
 *   12. Write a `ROLE_CHANGED` audit entry with the previous and new role
 *   13. Return 200 response with the updated user
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  const guard = await requireAdmin({ label: "PATCH /api/admin/users/[userId]" });
  if (!guard.ok) return guard.response;

  const { userId: rawUserId } = await context.params;
  const userId = rawUserId.trim();

  if (userId.length < 10 || userId.length > 40) {
    return invalidInput({ userId: ["A valid user id is required"] });
  }

  const body = await req.json().catch(() => null);
  const parsed = userRoleUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return invalidInput({ role: ["Choose a valid role"] });
  }
  const nextRole = parsed.data.role;

  const actorId = guard.session.user.id ?? null;
  const actorRole = (guard.session.user.role ?? "admin") as UserRole;

  if (actorId === userId) {
    return NextResponse.json(
      { error: "You cannot change your own role" },
      { status: 409 },
    );
  }

  try {
    const p = await getPool();

    const [rows] = await p.query<TargetRow[]>(
      `SELECT u.id, ${USER_NAME_EXPR} AS name, u.email, u.role, u.status
       FROM users u
       WHERE u.id = ?
       LIMIT 1`,
      [userId],
    );
    const target = rows[0];

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (target.role === nextRole) {
      return NextResponse.json(
        {
          ok: true,
          message: "Role unchanged",
          user: {
            id: target.id,
            name: target.name,
            email: target.email,
            role: target.role,
            status: target.status,
          },
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const isSuperAdmin = actorRole === "super_admin";
    const targetIsAdminLevel =
      target.role === "admin" || target.role === "super_admin";

    if (!isSuperAdmin && targetIsAdminLevel) {
      return NextResponse.json(
        { error: "Only a super admin can change an admin-level role" },
        { status: 403 },
      );
    }

    if (!isSuperAdmin && nextRole === "super_admin") {
      return NextResponse.json(
        { error: "Only a super admin can assign that role" },
        { status: 403 },
      );
    }

    if (target.role === "super_admin" && nextRole !== "super_admin") {
      const [countRows] = await p.query<CountRow[]>(
        `SELECT COUNT(*) AS total FROM users WHERE role = 'super_admin'`,
      );
      if (Number(countRows[0]?.total ?? 0) <= 1) {
        return NextResponse.json(
          { error: "At least one super admin must remain" },
          { status: 409 },
        );
      }
    }

    const now = getCurrentDateTime();
    await p.execute(
      `UPDATE users SET role = ?, updated_at = ? WHERE id = ?`,
      [nextRole, now, userId],
    );

    await auditLog.log(p, {
      userId: actorId,
      action: "ROLE_CHANGED",
      entityType: "USER",
      entityId: userId,
      description: `Changed role of ${target.email} from ${target.role} to ${nextRole}`,
      metadata: {
        from: target.role,
        to: nextRole,
        email: target.email,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Role updated",
        user: {
          id: target.id,
          name: target.name,
          email: target.email,
          role: nextRole,
          status: target.status,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[PATCH /api/admin/users/[userId]] failed:", err);
    return NextResponse.json(
      { error: "Could not update the role" },
      { status: 500 },
    );
  }
}
