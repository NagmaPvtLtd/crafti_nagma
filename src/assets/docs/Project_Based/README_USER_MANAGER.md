# User Manager (`/admin/user-manager`)

Admin-only screen that lists every registered account and controls staff access by
changing `users.role`. Reached from the navbar's Admin section (`User Manager`, role
`admin` and above).

## Files

| File | Purpose |
| --- | --- |
| `src/app/admin/user-manager/page.tsx` | Route shell and page metadata |
| `src/app/(components)/Pages/Admin/UserManagerClient.tsx` | List UI, filters, pagination, role select |
| `src/app/api/admin/users/route.ts` | `GET` — searchable, filterable, paginated user list |
| `src/app/api/admin/users/[userId]/route.ts` | `PATCH` — role change / access removal |
| `src/utils/zod/admin/userManager.zod.ts` | `USER_ROLES`, `USER_STATUSES`, `userRoleUpdateSchema` |

## Roles

`customer < manager < admin < super_admin`. Selecting **Customer (no access)** is how
staff access is removed; the explicit **Remove access** button does the same in one
click.

Guards enforced by `PATCH`:

- A user can never change their own role (409).
- Only a `super_admin` may change the role of an existing `admin` or `super_admin`.
- Only a `super_admin` may promote anybody to `super_admin`.
- The last remaining `super_admin` cannot be demoted (409).
- A role that already matches returns `200` with `Role unchanged` and writes nothing.

The API uses `requireAdmin`, so a `manager` gets `403` even if they open the URL
directly.

## What the screen shows

- Stored profile photo with initials fallback, display name, email, phone, role,
  status, profile-completion badge, password badge, verified mark and join date.
- Accounts are sorted A-Z by display name.
- Facet counts for roles and statuses, total account count.
- Filters: free-text search (name, email, phone), role, status; 25 per page.
- The caller's own row is marked "(you)" and its controls are disabled.

## Audit trail

Every accepted role change writes a `ROLE_CHANGED` row in `audit_logs`
(`entity_type = 'USER'`) with `{ from, to, email }` metadata, visible in
`/admin/audit-logs`.

## Notes

- `carts.session_id` remains reserved and unused; nothing here touches sessions.
- Runtime behaviour (sign-in, hitting the API, 403/409 paths) is manually tested by
  the owner, per `README_PROJECT_HABIT.md`.
