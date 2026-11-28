# Sessions and password cooldown

Authentication uses one `user_sessions` row per signed-in device. Password login
cooldown remains part of the same auth flow.

## Schema

Migration: `src/lib/Database/Migrations/20261127200835897_user_sessions.sql`

| Column | Type | Meaning |
| --- | --- | --- |
| `user_sessions.session_id` | `CHAR(40) PRIMARY KEY` | Unique `sess_<ulid>` carried by one device's JWT |
| `user_sessions.user_id` | `CHAR(40) NOT NULL` | Account that owns the device session |
| `user_sessions.created_at` | `DATETIME NOT NULL` | Sign-in time used for stale-session pruning |
| `users.cooldown_till` | `DATETIME NULL` | UTC moment password sign-in is allowed again |

The migration creates `user_sessions`, then drops the old shared
`users.session_id` column. `LATEST_SCHEMA.sql`, `UserRow.types.ts` and
`UserSession.types.ts` reflect the new shape.

## Per-device sessions

1. On every Google or credentials sign-in, the NextAuth `jwt` callback creates a
   fresh `sess_<ulid>`, prunes this user's rows older than the JWT max age, inserts
   the new `user_sessions` row, and stores the id in the token's `session_id`
   claim. The `session` callback also exposes it as `session.user.session_id`.
2. `requireRole` and its wrappers validate the token against the database with:

   ```sql
   SELECT session_id FROM user_sessions
   WHERE session_id = ? AND user_id = ?
   LIMIT 1;
   ```

   A missing token claim or row returns
   `401 { "error": "Your session is no longer active. Please sign in again." }`.
3. Normal sign-out runs `authOptions.events.signOut` and deletes only the row
   identified by the token:

   ```sql
   DELETE FROM user_sessions
   WHERE user_id = ? AND session_id = ?;
   ```

   Other devices remain signed in.
4. Changing a password in `/dashboard/profile` deletes every other device's row
   and keeps the current device's row:

   ```sql
   DELETE FROM user_sessions
   WHERE user_id = ? AND session_id <> ?;
   ```

   If a legacy token has no `session_id`, the fallback deletes all rows for that
   user. A future "sign out everywhere" action can use that same fallback
   explicitly.
5. Other profile edits do not touch `user_sessions`, so they do not sign out the
   device making the change.
6. `GET /api/auth/profile` already reads the live `users` row. Other devices see
   profile changes when they refresh that API; no profile-to-JWT synchronization
   or extra per-request profile query is added.

Files: `src/app/api/auth/[...nextauth]/route.ts`,
`src/utils/Auth/Auth.requireRole.util.ts`,
`src/app/api/auth/profile/update/route.ts`, `src/types/User/JWT.types.ts`,
`src/types/User/UserSession.types.ts`.

## Password cooldown

- 5 consecutive wrong passwords trigger a 24-hour cooldown
  (`MAX_FAILED_PASSWORD_ATTEMPTS`, `LOGIN_COOLDOWN_MS`).
- Wrong attempts 3 and 4 show an amber `3/5` or `4/5` warning instead of the
  generic invalid-email-or-password message. Attempt 5 starts the cooldown.
- Wrong attempts are counted in Redis (`auth:password-fail:<userId>`, 24h TTL), so an
  abandoned streak expires by itself. Redis failure is logged and the attempt is not
  counted rather than blocking sign-in.
- When the threshold trips, `cooldown_till` is written and the counter cleared. The
  attempt that trips it already sees the wait message.
- An active cooldown blocks both password and Google sign-in for that account.
- A correct password clears the Redis counter and any stale `cooldown_till`.
- MySQL DATETIME values are written and read as UTC (`timezone: "Z"`), so a new
  cooldown reports the full 24 hours instead of losing the server's local offset.
- The message uses the largest remaining unit, rounded up:
  `Please try to login again after 3 hours.` → minutes → seconds.
- Cooldown errors travel as `login_cooldown|<sentence>`; attempt warnings travel as
  `login_wrong_password|<sentence>`. `LoginClient` parses both, including errors
  returned to the login page after a blocked Google redirect.

Files: `src/utils/Auth/Auth.loginCooldown.util.ts` (pure, browser-safe),
`src/utils/Auth/Auth.loginGuard.util.ts` (Redis + `users` write),
`src/lib/Database/connection.db.ts`, `src/app/(components)/Pages/LoginClient.tsx`.

## Runtime checks

Sign-in, the 3/5 warning, fifth-attempt lockout, Google cooldown blocking,
cooldown timing, two-device sign-out, password-change revocation and the 401
revocation path are manually tested against a database. Static checks: `tsc`,
`eslint`, `next typegen`.
