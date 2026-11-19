# Instructions for creating a backend API

- We are using src\lib\Database\main.db.ts getPool() function to get a pool
- We use mysql2
- In the starting we use the required function among these:

```
export const requireSuperAdmin = (opts?: GuardOptions) =>
  requireRole(["super_admin"], opts);

export const requireAdmin = (opts?: GuardOptions) =>
  requireRole(["admin"], opts);

export const requireManager = (opts?: GuardOptions) =>
  requireRole(["manager"], opts);

export const requireAuth = (opts?: GuardOptions) =>
  requireRole(["customer"], opts);
```

Note: If we use the requireSuperAdmin then all the perms will be bypassed, if we require for example Manager, then admin can also bypass:

```
 *   requireSuperAdmin()   →  rank >= super_admin
 *   requireAdmin()        →  rank >= admin
 *   requireManager()      →  rank >= manager
 *   requireAuth()         →  any active logged-in user
```

So keep this in mind:

- Use the zod schema to validate the same way you are validation frontend and backend
- Use the src\services\AuditLog.service.ts service to properly log the event, and use the appropriate type which is suitable

---

## Checklist (point-wise)

- Order inside a handler: guard → zod `safeParse` → `getPool()` → `try / catch / finally { conn.release() }`.
- `requireManager()` (etc.) is still required inside the route even though `src\proxy.ts` already gates `/api/manager` — the guard is the trusted source of `guard.session.user.id`.
- Ids: `generateULID("<prefix>")` (`src/utils/generateULID.util.ts`) for **every** ID — CHAR(40) keys, audit entity ids, anything that needs a unique ID. Use a short lowercase prefix that identifies the entity, e.g. `generateULID("prod")` → `prod_<ulid>`, `generateULID("img")` → `img_<ulid>`, `generateULID("aud")` for audit logs, `generateULID("cat")` for categories, `generateULID("opt")` for global options, `generateULID("optv")` for option values, `generateULID("po")` for product options, `generateULID("pov")` for product option values, `generateULID("var")` for variants. **Never call `generateULID()` with no prefix.** Never hand-roll IDs with `randomUUID` or `crypto.randomUUID` — that is banned. Do not wrap `generateULID` in another function like `newId()` / `newCategoryId()` / `newOptionId()` / `newValueId()` — call `generateULID("<prefix>")` directly at the call site where the id is used. The only exception is a random short token that is **not** a row id (e.g. a 4-char uniqueness suffix inside a generated code like product codes) — that can use `generateULID().slice(0, 4)` from the util (not a direct `ulid()` import). Example: in `src/app/api/manager/product-studio/route.ts`, the `newCode()` function uses `generateULID().slice(0, 4).toUpperCase()` for the product code suffix.
- Timestamps: `getCurrentDateTime()` (`src\utils\ValueFetcher\getDateTime.util.ts`) — never `new Date()` inline.
- Validation failure: 400 `{ error: "Validation failed", details: parsed.error.flatten().fieldErrors }`.
- Other errors: `{ error: "<a sentence a manager can read>" }` — the UI prints that string as-is.
- MySQL hands back `COUNT(*)` / `SUM()` as strings → `Number(...)` before sending JSON.
- Catch `ER_DUP_ENTRY` and turn it into a field error (400), not a 500 — the DB is the final word on uniqueness.
- Audit every write with `auditLog.log(pool, …)` inside its own try/catch, so a failed audit never breaks the response. The audit log row id is generated with `generateULID("aud")` inside `AuditLogService.log` by default — pass `id` only when you need a specific one.
- Destructive `DELETE`: refuse with 409 + the reason while related rows still exist; do not cascade silently.
- Slugs: never hand-roll. `src\utils\Slug\slug.util.ts` exports `slugify`, `isValidSlug`, `isSlugTaken(db, source, slug, ignoreId)` and `buildUniqueSlug(db, source, base, { ignoreId })`. `source` is a key of `SLUG_SOURCES`, never a request value.
- One page → one client component → one API tree; do not spread a feature across two API folders.

## Shared file storage (`imagekit_files`)

- There is **one** polymorphic file table: `imagekit_files`. Do **not** create a separate join table for product/media relations (no `product_media`, no `product_variant_media`, no `*_media` table). The historical `product_media` join table was removed — if a migration or a `CREATE TABLE …_media` ever appears, treat it as a bug and delete it.
- Every file row already carries `file_purpose` (an ENUM: `product_variant_image`, `category_thumbnail`, `discount_picture`). Use the **existing** `file_purpose` enum to scope queries — do not invent new purposes without adding them to the ENUM first.
- Variant images are stored directly on `imagekit_files` using three columns together: `file_purpose = 'product_variant_image'` + `entity_type = 'product_variant'` + `entity_id = product_variants.id`. A base product has **no** images — images belong to variants only. Do not attach images to the `products` row or to a product-level entity_type unless the requirement explicitly changes.
- When you add ownership columns to `imagekit_files`, do it with an `ALTER TABLE` migration that adds `entity_type` and `entity_id` (and a CHECK constraint + index), not by creating a new table. The current migration is `src/lib/Database/Migrations/20261118175244390_imagekit_files_entity.sql`.
- Upload route (`POST /api/manager/product-studio/media`): insert **once** into `imagekit_files` with `file_purpose`, `entity_type`, `entity_id`, `sort_order`, `created_by`, `created_at`. Do not insert twice, and do not leave a second `INSERT` with missing `?` parameters — that fails at runtime.
- The `sort_order` for a new variant image is `COALESCE(MAX(sort_order), -1) + 1` filtered by `file_purpose` + `entity_type` + `entity_id` (the variant id), computed **before** the INSERT so the generated id can be used if needed.
- Media queries must select the columns they actually read. If the response maps `variantId`, `sortOrder`, `createdAt`, `fileId`, `id`, `url`, `altText` — the SQL must select each of those (or alias them), and the row interface must extend `RowDataPacket` with all of them. A query that selects only `f.id, f.url, f.alt_text` but then reads `row.variant_id`, `row.sort_order` or `row.created_at` returns `undefined` at runtime.
- When listing images for a product detail page, join `imagekit_files` to `product_variants` on `entity_id = product_variants.id` and filter on `product_variants.product_id = ?` — because images are stored against the **variant id**, not the product id. Filtering `entity_id = product_id` returns nothing.
- `DELETE /api/manager/product-studio/media?id=<imagekit_files.id>`: look up the row by `imagekit_files.id` + `file_purpose`, delete the ImageKit file via `ImageKitService.deleteFile(file_id)`, then `DELETE FROM imagekit_files WHERE id = ?`.
- Server-side uploads use `isPrivateFile: false`. ImageKit folder is built via `ImageKitService.envFolder(…)`. The next/image `remotePatterns` only allows `ik.imagekit.io/nagmapvtltd/**`, so admin-facing images use plain `<img>` (eslint-disable `@next/next/no-img-element`).
- Response shapes for media live in the zod schema next to the route (`ProductMediaItem` etc.). Keep the route mapping and the zod type in sync: if the schema says `sortOrder: number` and `createdAt: string`, the route must provide them, not `null`.

## Shared admin time-range vocabulary (`RangeType`)

- The admin dashboard and admin audit-logs features share a single time-range concept: `"30d" | "90d" | "365d" | "lifetime"`.
- This vocabulary is centralised in `src/utils/AdminRange/adminRange.types.ts` (the `RangeType` union) and `src/utils/AdminRange/adminRange.utils.ts` (the allowed-values list, the label map, and `parseRange`).
- **Do not** redefine this union, the allowed-values list, or the label map in any route or component. Import from the shared module:
  - routes: `import { type RangeType, parseRange } from "../../utils/AdminRange/adminRange.utils"` (adjust `../..` depth to the route's location)
  - components: `import { type RangeType, RANGES } from "../../utils/AdminRange/adminRange.utils"` (adjust depth to the component's location)
- `parseRange(v, fallback)` normalises a query-string range value. Unknown/empty values fall back to `fallback`. Each consumer passes its own fallback because the two admin features historically used different defaults:
  - dashboard fallback → `"90d"`
  - audit-logs fallback → `"30d"`
  Keep that difference explicit by passing the fallback at the call site, not by duplicating the parse logic.
- The shared `RANGES` label map is: `{30d: "30d", 90d: "90d", 365d: "1y", lifetime: "All"}`. Use it for the range-picker UI if you need labels; the raw value is the `RangeType` itself.
- **Do not** re-export `RangeType` from the individual admin route files as if it were the source of truth — the source of truth is `adminRange.types.ts`. If a new admin feature needs the same range concept, import from the shared module; do not copy the union again.
