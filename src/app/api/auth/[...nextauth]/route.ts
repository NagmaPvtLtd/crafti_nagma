import NextAuth, {
  NextAuthOptions,
  DefaultSession,
  DefaultUser,
} from "next-auth";
import Google, { GoogleProfile } from "next-auth/providers/google";
import { headers } from "next/headers";
import { initServer, db } from "../../../../lib/Database/main.db";

import type { Pool } from "mysql2/promise";
import {
  UserRow,
  UserRole,
  UserStatus,
} from "../../../../types/User/UserRow.types";
import { MyJWT } from "../../../../types/User/JWT.types";
import { getCurrentDateTime } from "../../../../utils/ValueFetcher/getDateTime.util";
import { generateULID } from "../../../../utils/generateULID.util";
import { auditLog } from "../../../../services/AuditLog.service";
import isRequestFromIndia from "../../../../utils/Auth/Auth.isFromIndia.util";

/* -------------------------------------------------------------------------- */
/*  Environment                                                               */
/* -------------------------------------------------------------------------- */

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

/* -------------------------------------------------------------------------- */
/*  Database pool (lazy, module-scoped singleton)                             */
/* -------------------------------------------------------------------------- */

let pool: Pool | null = null;

async function getPool(): Promise<Pool> {
  if (!pool) {
    await initServer();
    pool = db();
  }
  return pool;
}

/* -------------------------------------------------------------------------- */
/*  Small helpers                                                             */
/* -------------------------------------------------------------------------- */

function sanitizeString(value: unknown, maxLen = 255): string {
  if (typeof value !== "string") return "";
  const s = value.trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Splits a Google-style full name into first/last parts.
 * Uses the LAST space as the divider so compound first names stay intact
 * (e.g. "Priya Sharma Verma" → first: "Priya Sharma", last: "Verma").
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
  session: {
    strategy: "jwt",
    maxAge: 60 * 24 * 30, // 30 days
  },

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

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    /**
     * ## `signIn` callback
     *
     * Runs before a session is created. Returning `false` rejects the flow.
     *
     * ### Rules
     *
     * | User type     | Request origin | Result                                     |
     * |---------------|----------------|--------------------------------------------|
     * | Any           | Not India      | **Rejected** (geo gate)                    |
     * | Banned user   | India          | **Rejected**                               |
     * | Existing user | India          | Logged in, Google fields refreshed         |
     * | New user      | India          | Created with role = 'customer'             |
     */
    async signIn({ profile }) {
      const pool = await getPool();
      const reqHeaders = await headers();

      /* ---- 1. Geo gate: only allow requests from India ------------- */
      const fromIndia = await isRequestFromIndia(reqHeaders);
      if (!fromIndia) {
        console.log("SignIn rejected: request origin is not India");
        return false;
      }

      /* ---- 2. Validate Google profile ------------------------------ */
      const googleProfile = profile as GoogleProfile;
      if (!googleProfile.email) return false;

      const email = sanitizeString(googleProfile.email, 320);
      if (!isValidEmail(email)) return false;

      const googleId = sanitizeString(googleProfile.sub ?? "", 255);
      if (!googleId) return false;

      const fullName = sanitizeString(googleProfile.name ?? "", 255);
      const googlePicture =
        sanitizeString(googleProfile.picture ?? "", 500) || null;
      const { firstName, lastName } = splitFullName(fullName);
      const now = getCurrentDateTime();

      try {
        /* ---- 3. Existing user? ------------------------------------ */
        const [rows] = await pool.execute<UserRow[]>(
          "SELECT id, role, status FROM users WHERE email = ? OR google_id = ?",
          [email, googleId],
        );

        const userExists = Array.isArray(rows) && rows.length > 0;

        /* ---- 3a. Banned users cannot log in ---------------------- */
        if (userExists) {
          const existing = rows[0];

          if (existing.status === "banned") {
            console.log(`SignIn rejected: user ${email} is banned`);
            return false;
          }

          // Refresh Google-derived fields (name / picture can change
          // on Google's side, so we keep them in sync on every login).
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

          return true;
        }

        /* ---- 4. New user → create account ------------------------- */
        const newId = generateULID({
          prefix: "user",
          separator: "_",
          maxLength: 40,
        });

        // IMPORTANT: `users.phone` is NOT NULL UNIQUE in the current schema,
        // but Google OAuth does not provide a phone number.
        //
        // Two options:
        //   (a) RECOMMENDED — make `phone` nullable and collect it in a
        //       follow-up "complete your profile" step.
        //   (b) Use a unique placeholder that the profile step overwrites.
        //
        // We go with (b) here so the schema doesn't have to change today.
        // `PENDING_` prefix + 12 chars from the ULID = exactly 20 chars.
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

        return true;
      } catch (error: unknown) {
        console.error("SignIn error:", error);
        return false;
      }
    },

    /**
     * ## `jwt` callback
     *
     * Re-hydrates the token from the DB on signIn and on explicit `update`
     * triggers, so role/status changes are picked up without a re-login.
     */
    async jwt({ token, user, account, profile, trigger }) {
      const t = token as MyJWT;
      const pool = await getPool();

      let emailToCheck: string | null = null;

      if (account?.provider === "google" && profile) {
        const googleProfile = profile as GoogleProfile;
        emailToCheck = googleProfile.email ?? null;
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

    /**
     * ## `session` callback
     *
     * Copies the fields we care about from the JWT onto the client-visible
     * session object.
     */
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

    /**
     * ## `redirect` callback
     *
     * Keeps same-origin redirects intact; everything else goes to `/`.
     */
    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return url;
      return baseUrl + "/";
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
export { authOptions };
