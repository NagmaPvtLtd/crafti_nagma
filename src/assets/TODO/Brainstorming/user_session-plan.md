# User sessions — per-device table (20261127200835897_user_sessions.sql)

## Goal
- One row per signed-in device in its own table instead of a single
  `users.session_id` per account.
- Sign-in : insert the device's `user_id` + its `new session_id`.
- Sign-out : delete **only that device's** row.
- Password change / other profile edits should **not** log the changer out.
  Other devices can be revoked on demand by deleting their rows.

## Sign-out behaviour (decided)
Normal sign-out deletes only the signing-out device's row. The rest keep
going.

SQL:
```sql
DELETE FROM user_sessions
  WHERE user_id = ? AND session_id = ?;
```
Inputs: `user_id` from the token, `session_id` from the token's `session_id`.

Separate future variant (not in this plan): "sign-out everywhere" can later
become `DELETE FROM user_sessions WHERE user_id = ?` if we ever want one
device's sign-out to kill every other device too.

## When other devices are revoked (password change)
`POST /api/auth/profile/update` on a password change deletes every other
device's row and keeps the changer's row:
```sql
DELETE FROM user_sessions
  WHERE user_id = ? AND session_id <> ?;
```
Inputs: the user id of the account, and the current device's `session_id`.
If the current token has no `session_id` (legacy case), fallback to
`WHERE user_id = ?` so stale rows are cleaned and the changer re-signs in.

Other profile edits (phone, name, address, role/status etc.) do **not** touch
`user_sessions` — the changer stays signed in.

## Profile data visible on other devices
Latest user feedback: this is no longer needed as a special feature.

`GET /api/auth/profile` already reads the live `users` row, so:
- device 1 changing phone, then device 2 refreshing `/dashboard/profile`
  → device 2 sees the new phone through that API hit.
- No separate "push profile into the JWT" sync is required for that.

Because that real profile read already gives the latest data, the plan drops
the "fold profile into the guard's query too" idea. The guard keeps doing
only session validation against `user_sessions` (`SELECT … FROM
user_sessions WHERE session_id = ? AND user_id = ?`), not a separate profile
refresh.

Explicitly **not** doing:
- a separate per-request `SELECT` for profile sync outside the guard,
- a per-render JWT refresh inside the React Server Component session passport.

If later something else starts needing live name/photo/role from the token
passport (for some page other than the profile page), that is a new decision,
not part of this plan.

## signOut / events
- `authOptions.events.signOut` deletes only the signing-out device's row
  (`WHERE user_id = ? AND session_id = ?`).
- On sign-in: insert the new row. Optionally prune rows older than the JWT
  lifetime on that user so the table does not keep growing forever. Token
  lifetime here is 30 days (`60 * 24 * 30 * 6` seconds); rows older than
  that are garbage.

## Migration file and name
File: `src/lib/Database/Migrations/20261127200835897_user_sessions.sql`

The runner reads migration files by name and sorts them chronologically, so the
prefix `20261127200835897` keeps it after everything that ran before. Naming
follows the existing file style `YYYYMMDDHHMMSSmmm_short_snake_name.sql`.

This one file has two statements, each on its own:

1. `CREATE TABLE user_sessions (...)` — the new per-device rows.
2. `ALTER TABLE users DROP COLUMN session_id` — drop the old single-value
   column now that rows live in `user_sessions`.

Keep them as two separate statements, not one multi-column `ALTER` or a
transaction, following `src/assets/docs/Project_Based/README_MIGRATIONS.md`
(the TiDB-safe rules). No `AFTER`, no foreign keys on alter, no `START
TRANSACTION`.

At the same time, update `src/lib/Database/Dump/LATEST_SCHEMA.sql` so the
current dump still matches: remove `session_id` from the `users` table block,
add the `user_sessions` table block.

New type file: `src/types/User/UserSession.types.ts` for the session row.

## What changes in each code file
- `src/app/api/auth/[...nextauth]/route.ts`
  - sign-in (`account` present) inserts the row; the old COALESCE path on
    `users.session_id` is removed.
  - `events.signOut` deletes only this device's row.
  - prune stale rows on sign-in (guarded by `created_at` older than the JWT
    lifetime).
- `src/app/api/auth/profile/update/route.ts`
  - password change deletes every other device's row only.
  - no more `SET session_id = …` there.
- `src/app/api/auth/profile/route.ts`
  - no change needed for this; it already reads the live `users` row.
- `src/utils/Auth/Auth.requireRole.util.ts`
  - validate against `user_sessions` with
    `SELECT session_id FROM user_sessions WHERE session_id = ? AND user_id = ?
    LIMIT 1`. No separate profile refresh.

## Things not changing
- `carts.session_id` stays reserved/unused here.
- `README_USER_MANAGER.md` line about `carts.session_id` stays.
- The cooldown / failed-password path stays as-is.
- `README_AUTH_SESSIONS.md` will be rewritten to reflect this design.
