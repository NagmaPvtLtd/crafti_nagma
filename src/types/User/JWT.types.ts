import type { UserRole, UserStatus } from "./UserRow.types";

export interface MyJWT {
  id?: string;
  name?: string;
  email?: string;
  image?: string | null;
  role?: UserRole;
  status?: UserStatus;
  profile_completed?: boolean;
  [key: string]: unknown;
}

/**
 * Shape guaranteed by the session() callback in the auth route.
 * Every field below is always populated server-side, so mark them
 * required here — otherwise every consumer has to defend against
 * `undefined` for values that will never actually be missing.
 */
export interface SessionUserClient {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: UserRole;
  status: UserStatus;
  profile_completed: boolean;
}
