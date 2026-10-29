import NextAuth, {
  NextAuthOptions,
  DefaultSession,
  DefaultUser,
} from "next-auth";
import Google, { GoogleProfile } from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";

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
import { googleProfileSchema } from "../../../../utils/zod/auth.valildator.zod";
import { getPool } from "../../../../lib/Database/main.db";
import { credentialsSchema } from "../../../../utils/zod/auth.credentialsLogin.schemas.zod";

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

    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      /**
       * Return contract:
       *  - valid user  → return user object (NextAuth signs in)
       *  - banned / inactive / no password → throw typed error so NextAuth
       *    surfaces it as `?error=<code>` on /login
       *  - any other failure → return null (becomes generic CredentialsSignin)
       */
      async authorize(credentials) {
        try {
          const parsed = credentialsSchema.safeParse(credentials);
          if (!parsed.success) return null;

          const { email, password } = parsed.data;
          const pool = await getPool();
          const conn = await pool.getConnection();

          try {
            const [rows] = await conn.query<UserRow[]>(
              `SELECT id, first_name, last_name, full_name, email,
                      password_hash, google_profile_picture,
                      role, status, profile_completed
                 FROM users
                WHERE email = ?
                LIMIT 1`,
              [email],
            );

            if (!Array.isArray(rows) || rows.length === 0) return null;

            const dbUser = rows[0];

            /* ---- banned ---- */
            if (dbUser.status === "banned") {
              throw new Error("account_banned");
            }

            /* ---- inactive ---- */
            if (dbUser.status === "inactive") {
              throw new Error("account_inactive");
            }

            /* ---- no password set (Google-only account) ---- */
            if (!dbUser.password_hash) {
              throw new Error("password_not_set");
            }

            /* ---- password check ---- */
            const valid = await bcrypt.compare(password, dbUser.password_hash);
            if (!valid) return null;

            return {
              id: dbUser.id,
              name: dbUser.full_name ?? dbUser.first_name ?? "",
              email: dbUser.email,
              image: dbUser.google_profile_picture ?? null,
              role: dbUser.role,
              status: dbUser.status,
              profile_completed: Boolean(dbUser.profile_completed),
            };
          } finally {
            conn.release();
          }
        } catch (err) {
          if (
            err instanceof Error &&
            ["account_banned", "account_inactive", "password_not_set"].includes(
              err.message,
            )
          ) {
            throw err;
          }
          console.error("[AUTH - CREDENTIALS] error:", err);
          return null;
        }
      },
    }),
  ],

  pages: { signIn: "/login", error: "/login" },

  callbacks: {
    /**
     * Gate order (Google only — Credentials already validated in authorize):
     *
     *   1. Geo             — outside India           → `region_error`
     *   2. Global lock     — nobody_can_login        → `service_offline`
     *   3. Zod parse       — malformed Google data   → silent `false`
     *   4. Signup lock     — new_user_not_allowed    → `signups_closed`
     *                          (only fires when the user does not exist)
     *   5. Ban / inactive  — status checks           → `account_banned` / `account_inactive`
     *   6. Upsert          — refresh existing / create new
     */
    async signIn({ account, profile }) {
      /* ---- Credentials: already vetted in authorize() ---- */
      if (account?.provider === "credentials") {
        return true;
      }

      /* ---- Google ---- */
      if (account?.provider !== "google") return false;

      const pool = await getPool();
      const reqHeaders = await headers();

      /* 1. Geo */
      if (!(await isRequestFromIndia(reqHeaders))) {
        console.warn("[AUTH - SIGNIN] ✕ region_error");
        return loginRedirect("region_error");
      }

      /* 2. Global lock */
      const globalLock = await setting.isActive(pool, TOGGLE_NOBODY_CAN_LOGIN);
      console.log(
        `[AUTH - SIGNIN] ➤ toggle "${TOGGLE_NOBODY_CAN_LOGIN}" = ${globalLock}`,
      );
      if (globalLock) {
        console.warn("[AUTH - SIGNIN] ✕ service_offline");
        return loginRedirect("service_offline");
      }

      /* 3. Parse */
      const parsed = googleProfileSchema.safeParse(profile);
      if (!parsed.success) {
        console.warn(
          `[AUTH - SIGNIN] ✕ invalid Google profile : ${JSON.stringify(
            parsed.error.flatten().fieldErrors,
          )}`,
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

      const conn = await pool.getConnection();

      try {
        /* 4. Existing user? */
        const [rows] = await conn.query<UserRow[]>(
          `SELECT id, role, status FROM users
            WHERE email = ? OR google_id = ?
            LIMIT 1`,
          [email, googleId],
        );
        const userExists = Array.isArray(rows) && rows.length > 0;

        /* 4a. Signup lock */
        if (!userExists) {
          const newUserBlocked = await setting.isActive(
            pool,
            TOGGLE_NEW_USER_BLOCKED,
          );
          console.log(
            `[AUTH - SIGNIN] ➤ toggle "${TOGGLE_NEW_USER_BLOCKED}" = ${newUserBlocked} | new user: ${email}`,
          );
          if (newUserBlocked) {
            console.warn(`[AUTH - SIGNIN] ✕ signups_closed | ${email}`);
            return loginRedirect("signups_closed");
          }
        }

        /* 4b. Banned / inactive */
        if (userExists) {
          if (rows[0].status === "banned") {
            console.warn(`[AUTH - SIGNIN] ✕ account_banned | ${email}`);
            return loginRedirect("account_banned");
          }
          if (rows[0].status === "inactive") {
            console.warn(`[AUTH - SIGNIN] ✕ account_inactive | ${email}`);
            return loginRedirect("account_inactive");
          }

          await conn.query(
            `UPDATE users
                SET google_id = ?,
                    google_profile_picture = ?,
                    full_name = ?,
                    email_verified = TRUE,
                    updated_at = ?
              WHERE email = ?`,
            [googleId, googlePicture, fullName, now, email],
          );

          console.log(`[AUTH - SIGNIN] >_ existing user | ${email}`);
          return true;
        }

        /* 5. New user */
        const newId = generateULID({
          prefix: "user",
          separator: "_",
          maxLength: 40,
        });

        await conn.query(
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
            null,
            googleId,
            googlePicture,
            now,
          ],
        );

        try {
          await auditLog.log(pool, {
            userId: newId,
            action: "CREATE",
            entityType: "USER",
            description: `New user registered via Google OAuth. [email=${email}]`,
          });
        } catch {
          /* audit must never break sign-in */
        }

        console.log(`[AUTH - SIGNIN] >_ new user created | ${email}`);
        return true;
      } catch (error: unknown) {
        console.error("[AUTH - SIGNIN] ✕ sign-in flow failed :", error);
        return false;
      } finally {
        conn.release();
      }
    },

    async jwt({ token, user, account, profile, trigger }) {
      const t = token as MyJWT;

      let emailToCheck: string | null = null;

      if (account?.provider === "google" && profile) {
        const gp = profile as GoogleProfile;
        emailToCheck = gp.email ?? null;
      }
      if (user?.email) emailToCheck = user.email;
      if (trigger === "update" && t.email) emailToCheck = t.email;

      if (!emailToCheck) return t;

      const pool = await getPool();
      const conn = await pool.getConnection();

      try {
        const [rows] = await conn.query<UserRow[]>(
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
      } catch (err) {
        console.error("[AUTH - JWT] error:", err);
      } finally {
        conn.release();
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
