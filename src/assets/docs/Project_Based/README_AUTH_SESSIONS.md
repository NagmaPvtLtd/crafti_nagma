# Sessions and password cooldown

Two additions to the password login path and the shared auth guard.

## Schema

Migration: `src/lib/Database/Migrations/20261124120000000_user_session_and_cooldown.sql`

| Column | Type | Meaning |
| --- | --- | --- |
| `users.session_id` | `CHAR(40) NULL` | The one session currently allowed for the account |
| `users.cooldown_till` | `DATETIME NULL` | UTC moment password sign-in is allowed again |

`LATEST_SCHEMA.sql` and `UserRow.types.ts` carry the same fields.

## Single active session

1. On every fresh sign-in (Google or password), the `jwt` callback creates
   `sess_<ulid>` and writes it to `users.session_id`; the token stores the same id in
   its `session_id` claim (also copied to `session.user.session_id`).
2. `requireRole` / `requireAuth` / `requireAdmin` / `requireManager` now compare the
   token claim with the database value on every guarded call. A mismatch (newer
   sign-in elsewhere, password change) returns
   `401 { "error": "Your session is no longer active. Please sign in again." }`.
3. Tokens issued before this change have no claim, so they are signed out on their
   next protected request.
4. Changing the password in `/dashboard/profile` rotates `session_id`, which signs
   out every device, including the one that made the change. Sign in again after a
   password change.
5. Because the column holds one id, signing in on a second device signs the first
   device out. That is the intended single-session behaviour of this design.

Files: `src/app/api/auth/[...nextauth]/route.ts`,
`src/utils/Auth/Auth.requireRole.util.ts`,
`src/app/api/auth/profile/update/route.ts`, `src/types/User/JWT.types.ts`.

## Password cooldown

- 7 consecutive wrong passwords trigger a 24-hour cooldown
  (`MAX_FAILED_PASSWORD_ATTEMPTS`, `LOGIN_COOLDOWN_MS`).
- Wrong attempts are counted in Redis (`auth:password-fail:<userId>`, 24h TTL), so an
  abandoned streak expires by itself. Redis failure is logged and the attempt is not
  counted rather than blocking sign-in.
- When the threshold trips, `cooldown_till` is written and the counter cleared. The
  attempt that trips it already sees the wait message.
- A correct password clears the Redis counter and any stale `cooldown_till`.
- The message uses the largest remaining unit, rounded up:
  `Please try to login again after 3 hours.` → minutes → seconds.
- The message travels from `authorize` as `login_cooldown|<sentence>`; `LoginClient`
  reads it with `parseCooldownError` and shows the sentence instead of the generic
  sign-in error.

Files: `src/utils/Auth/Auth.loginCooldown.util.ts` (pure, browser-safe),
`src/utils/Auth/Auth.loginGuard.util.ts` (Redis + `users` write),
`src/app/(components)/Pages/LoginClient.tsx`.

## Runtime checks

Sign-in, cooldown timing and the 401 revocation path are manually tested by the
owner. Static checks only: `tsc`, `eslint`, `next typegen`.
