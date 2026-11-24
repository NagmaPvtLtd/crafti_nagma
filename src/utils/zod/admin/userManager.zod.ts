import { z } from "zod";

import type { UserRole, UserStatus } from "../../../types/User/UserRow.types";

/** Every role the `users.role` enum accepts, low → high. */
export const USER_ROLES = [
  "customer",
  "manager",
  "admin",
  "super_admin",
] as const satisfies readonly UserRole[];

/** Every status the `users.status` enum accepts. */
export const USER_STATUSES = [
  "active",
  "inactive",
  "banned",
] as const satisfies readonly UserStatus[];

/** `PATCH /api/admin/users/[userId]` — a full role replacement. */
export const userRoleUpdateSchema = z.object({
  role: z.enum(USER_ROLES),
});

export type UserRoleUpdateInput = z.infer<typeof userRoleUpdateSchema>;
