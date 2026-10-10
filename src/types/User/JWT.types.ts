import type { JWT } from "next-auth/jwt";
import type { UserRole, UserStatus } from "./UserRow.types";

export type MyJWT = JWT & {
  id?: string;
  name?: string;
  email?: string;
  image?: string | null;
  role?: UserRole;
  status?: UserStatus;
  profile_completed?: boolean;
};

/**
 * Client-safe subset of the session user, useful for passing into
 * `AppShell` and other client components.
 */
export type SessionUserClient = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: UserRole;
  status: UserStatus;
  profile_completed: boolean;
};
