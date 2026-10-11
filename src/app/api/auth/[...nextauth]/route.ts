import NextAuth, {
  NextAuthOptions,
  DefaultSession,
  DefaultUser,
} from "next-auth";
import Google, { GoogleProfile } from "next-auth/providers/google";
import { headers } from "next/headers";

import {
  UserRow,
  UserRole,
  UserStatus,
} from "../../../../types/User/UserRow.types";
import { MyJWT } from "../../../../types/User/JWT.types";
import { getCurrentDateTime } from "../../../../utils/ValueFetcher/getDateTime.util";
import { generateULID } from "../../../../utils/generateULID.util";
import { auditLog } from "../../../../services/AuditLog.service";
import { setting } from "../../../../services/Setting.service";
import isRequestFromIndia from "../../../../utils/Auth/Auth.isFromIndia.util";
import { googleProfileSchema } from "../../../../utils/Validators/auth.valildator.zod";
import { getPool } from "../../../../lib/Database/main.db";

/* -------------------------------------------------------------------------- */
/*  Environment                                                               */
/* -------------------------------------------------------------------------- */

const GOOGLE_CLIENT_ID: string = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET: string = process.env.GOOGLE_CLIENT_SECRET!;

/* -------------------------------------------------------------------------- */
/*  Feature toggle keys                                                       */
/* -------------------------------------------------------------------------- */

const TOGGLE_NOBODY_CAN_LOGIN: string = "backend:nobody_can_login";
const TOGGLE_NEW_USER_BLOCKED: string = "backend:new_user_not_allowed_to_login";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Splits a full name on the LAST space so compound first names stay
 * intact: "Priya Sharma Verma" → first "Priya Sharma", last "Verma".
 * Empty input falls back to a placeholder so NOT NULL constraints pass.
 */
function splitFullName(fullName: string): {
  firstName: string;
  lastName: string | null;
} {
  const trimmed = fullName.trim();
  if (!trimmed) return { firstName: "Customer", lastName: null };
  const idx = trimmed.lastIndexOf(" ");
  if (idx === -1) return { firstName: trimmed, lastName: null };
  return {
    firstName: trimmed.slice(0, idx).trim() || "Customer",
    lastName: trimmed.slice(idx + 1).trim() || null,
  };
}

function loginRedirect(code: string): string {
  return `/login?error=${encodeURIComponent(code)}`;
}

/* -------------------------------------------------------------------------- */
/*  NextAuth module augmentation                                              */
/* -------------------------------------------------------------------------- */

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string;
      email?: string;
      image?: string | null;
      role?: UserRole;
      status?: UserStatus;
      profile_completed?: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id?: string;
    name?: string;
    email?: string;
    image?: string | null;
    role?: UserRole;
    status?: UserStatus;
    profile_completed?: boolean;
  }
}

/* -------------------------------------------------------------------------- */
/*  NextAuth options                                                          */
/* -------------------------------------------------------------------------- */

const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 24 * 30 },

  providers: [
    Google({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],

  pages: { signIn: "/login", error: "/login" },

  callbacks: {
    /**
     * Gate order — first match wins:
     *
     *   1. Geo             — outside India           → `region_blocked`
     *   2. Global lock     — nobody_can_login        → `service_offline`
     *   3. Zod parse       — malformed Google data   → silent `false`
     *   4. Signup lock     — new_user_not_allowed    → `signups_closed`
     *                          (only fires when the user does not exist)
     *   5. Ban             — status = 'banned'       → `account_banned`
     *   6. Upsert          — refresh existing / create new
     *
     * Returning a string URL redirects `/login` with `?error=<code>`;
     * returning `false` produces NextAuth's generic `AccessDenied`.
     */
    async signIn({ profile }) {
      const pool = await getPool();
      const reqHeaders = await headers();

      /* ---- 1. Geo ---------------------------------------------------- */
      if (!(await isRequestFromIndia(reqHeaders))) {
        console.log("[auth:signIn] ✗ region_blocked");
        return loginRedirect("region_error");
      }

      /* ---- 2. Global lock -------------------------------------------- */
      const globalLock = await setting.isActive(pool, TOGGLE_NOBODY_CAN_LOGIN);
      console.log(
        `[auth:signIn] toggle "${TOGGLE_NOBODY_CAN_LOGIN}" = ${globalLock}`,
      );
      if (globalLock) {
        console.log("[auth:signIn] ✗ service_offline");
        return loginRedirect("service_offline");
      }

      /* ---- 3. Parse + normalise Google profile ----------------------- */
      const parsed = googleProfileSchema.safeParse(profile);
      if (!parsed.success) {
        console.warn(
          "[auth:signIn] ✗ invalid Google profile",
          parsed.error.flatten().fieldErrors,
        );
        return false;
      }

      const {
        email,
        sub: googleId,
        name: fullName,
        picture: googlePicture,
      } = parsed.data;

      const { firstName, lastName } = splitFullName(fullName);
      const now = getCurrentDateTime();

      try {
        /* ---- 4. Existing user? ------------------------------------- */
        const [rows] = await pool.execute<UserRow[]>(
          "SELECT id, role, status FROM users WHERE email = ? OR google_id = ?",
          [email, googleId],
        );
        const userExists = Array.isArray(rows) && rows.length > 0;

        /* ---- 4a. Signup lock (new accounts only) ------------------- */
        if (!userExists) {
          const newUserBlocked = await setting.isActive(
            pool,
            TOGGLE_NEW_USER_BLOCKED,
          );
          console.log(
            `[auth:signIn] toggle "${TOGGLE_NEW_USER_BLOCKED}" = ${newUserBlocked} [new: ${email}]`,
          );
          if (newUserBlocked) {
            console.log(`[auth:signIn] ✗ signups_closed [${email}]`);
            return loginRedirect("signups_closed");
          }
        }

        /* ---- 4b. Banned -------------------------------------------- */
        if (userExists) {
          if (rows[0].status === "banned") {
            console.log(`[auth:signIn] ✗ account_banned [${email}]`);
            return loginRedirect("account_banned");
          }

          await pool.execute(
            `UPDATE users
                SET google_id = ?,
                    google_profile_picture = ?,
                    full_name = ?,
                    email_verified = TRUE,
                    updated_at = ?
              WHERE email = ?`,
            [googleId, googlePicture, fullName, now, email],
          );

          console.log(`[auth:signIn] ✓ existing user [${email}]`);
          return true;
        }

        /* ---- 5. Create new user ------------------------------------ */
        const newId = generateULID({
          prefix: "user",
          separator: "_",
          maxLength: 40,
        });

        // users.phone is NOT NULL UNIQUE but Google OAuth doesn't send one.
        // PENDING_ + 12 chars = 20 chars, matching the column limit.
        const tempPhone = `PENDING_${newId.slice(0, 12)}`;

        await pool.execute(
          `INSERT INTO users (
             id, first_name, last_name, full_name,
             email, phone, google_id, google_profile_picture,
             email_verified, role, status,
             profile_completed, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, 'customer', 'active', FALSE, ?)`,
          [
            newId,
            firstName,
            lastName,
            fullName,
            email,
            tempPhone,
            googleId,
            googlePicture,
            now,
          ],
        );

        await auditLog.log(pool, {
          userId: newId,
          action: "CREATE",
          entityType: "USER",
          description: `New user registered via Google OAuth. [email=${email}]`,
        });

        console.log(`[auth:signIn] ✓ new user created [${email}]`);
        return true;
      } catch (error: unknown) {
        console.error("[auth:signIn] error:", error);
        return false;
      }
    },

    async jwt({ token, user, account, profile, trigger }) {
      const t = token as MyJWT;
      const pool = await getPool();

      let emailToCheck: string | null = null;

      if (account?.provider === "google" && profile) {
        const gp = profile as GoogleProfile;
        emailToCheck = gp.email ?? null;
      }
      if (user?.email) emailToCheck = user.email;
      if (trigger === "update" && t.email) emailToCheck = t.email;

      if (emailToCheck) {
        const [rows] = await pool.execute<UserRow[]>(
          `SELECT id, first_name, last_name, full_name, email,
                  google_profile_picture,
                  role, status, profile_completed
             FROM users
            WHERE email = ?`,
          [emailToCheck],
        );

        if (Array.isArray(rows) && rows.length > 0) {
          const dbUser = rows[0];
          t.id = dbUser.id ?? t.id;
          t.name = dbUser.full_name ?? t.name ?? "";
          t.email = dbUser.email ?? emailToCheck;
          t.image = dbUser.google_profile_picture ?? null;
          t.role = dbUser.role ?? "customer";
          t.status = dbUser.status ?? "active";
          t.profile_completed = Boolean(dbUser.profile_completed);
        }
      }

      return t;
    },

    async session({ session, token }) {
      const t = token as MyJWT;
      if (session.user) {
        session.user.id = t.id;
        session.user.name = t.name;
        session.user.email = t.email;
        session.user.image = t.image ?? null;
        session.user.role = t.role ?? "customer";
        session.user.status = t.status ?? "active";
        session.user.profile_completed = Boolean(t.profile_completed);
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return url;
      return baseUrl + "/";
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
export { authOptions };
