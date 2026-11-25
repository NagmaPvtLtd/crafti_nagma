# Product Studio — module notes

Scope: everything under `/manager/product-studio` and `/api/manager/product-studio`.
General rules are **not** repeated here — see `README_API_STRUCTURE.md`,
`README_TYPESAFETY.md` and `README_UI_UX.md`. This file records what Product
Studio does and the rules specific to it.

## What it does

The manager surface for the catalogue: one hub page, the two shared pools every
product draws from, and the base-product form that turns them into a product.

| Path | What it does |
|---|---|
| `/manager/product-studio` | Hub — catalogue snapshot, section cards, recently updated products |
| `/manager/product-studio/categories` | Global Categories — main categories and their sub categories |
| `/manager/product-studio/options` | Global Options — option pools (Colour, Size, Material) and the values inside them |
| `/manager/product-studio/tags` | Global Tags — the reusable tag master (search, rename, delete unused) |
| `/manager/product-studio/products/new` | Add a product — create the **base** product |
| `GET /api/manager/product-studio/overview` | Counts for the hub: products, variants, categories (`total`, `root`), options, recent products |
| `GET/POST/PUT/DELETE /api/manager/product-studio/categories` | Read the category tree with totals; create, rename/move and delete |
| `GET/POST/PUT/DELETE /api/manager/product-studio/options` | Read options with their values nested; create, rename and delete |
| `POST/PUT/DELETE /api/manager/product-studio/options/values` | Add, rename and delete a value inside an option |
| `GET/POST /api/manager/product-studio/tags` | List tags with usage counts (optional `?search=`), or create/reuse a tag |
| `PUT/DELETE /api/manager/product-studio/tags/[tagId]` | Rename a tag (slug regenerated) or delete an unused one |
| `POST /api/manager/product-studio` | Create a base product with its categories, options and values |
| `POST /api/manager/product-studio/[id]/variants` | Generate variants — always created `inactive`, existing combinations are skipped |

- `api/manager/products` was merged into `api/manager/product-studio` — never
  recreate the old folder, and treat a reference to the old path as a bug.

## Files

- Page routes: `src/app/manager/product-studio/{page.tsx,categories/page.tsx,options/page.tsx,products/new/page.tsx}`
  — one-liners that render a client component.
- Page clients: `src/app/(components)/Pages/Manager/{ProductManagerClient,GlobalCategoriesClient,GlobalOptionsClient,AddProductClient}.tsx`
- Schemas + response types: `src/utils/zod/product/manager.{category,option,product}.zod.ts`
- Shared slug helper: `src/utils/Slug/slug.util.ts`

## Params handling for dynamic routes

- Dynamic route pages (`[product_id]/page.tsx`, `[product_id]/variants/[variant_id]/page.tsx`) use `useParams()` from `next/navigation` instead of awaiting the params Promise.
- These pages must have the `"use client"` directive at the top since `useParams` is a client hook.
- Example: `const { product_id } = useParams<{ product_id: string }>();`

## Data

- `categories(id, name, slug UNIQUE, parent_id)`, `product_categories(product_id, category_id)`
- `global_options(id, name UNIQUE, description)`, `global_option_values(id, option_id, value)` + `UNIQUE (option_id, value)`
- `product_options(product_id, global_option_id ON DELETE RESTRICT)`, `product_option_values(option_id, global_option_value_id ON DELETE RESTRICT)`

Rules enforced in the APIs:

- Categories are **two levels only** — a sub category can never be a parent, and
  `PUT` refuses to move a category that has children under another parent.
- Slug is unique per table and generated from the name when left blank; the
  shared helper does the suffixing, the API does not.
- Deleting an option cascades its own values. Everything else is refused with a
  409 and a readable reason: a category with sub categories or products, an
  option used by a product, a value used by a product option.
- Per-product options reference the global pools by id — the option/value labels
  are copied into `product_options`/`product_option_values` at creation time, but
  the ids still point at the global pool.
- Audit entity types used here: `CATEGORY`, `OPTION`, `OPTION_VALUE`, `PRODUCT`.

## Global tags

- One reusable master: `global_tags(id, name UNIQUE, slug UNIQUE)`. A tag is
  referenced, never copied — `product_tag_mappings` links base products and
  `product_variant_tag_mappings` links variant-specific tags. Both cascade on
  delete of the owner; the tag itself cascades out of the mappings.
- **Effective variant tags = base product tags + variant-specific tags.**
  Inherited tags are never inserted into the variant table and never
  synchronised. A variant editor shows the inherited chips read-only.
- Limits: 15 tags per base product, 15 additional tags per variant, 100
  characters per tag. Enforced in zod (`tagIds` on the base-product create /
  update schemas and on the variant update schema) and again by the routes.
- Tag names are trimmed and whitespace-collapsed; the slug comes from the
  shared slug helper (`SLUG_SOURCES.global_tags`), so renaming can never leave
  a stale slug. A rename onto another tag's name answers 400 — tags are never
  silently merged.
- Creating a tag reuses an existing one with the same name (case-insensitive,
  DB collation) instead of failing on a duplicate.
- Deleting a tag is refused with 409 while any product or variant still uses
  it; the message carries both counts.
- After any product/variant tag edit, `pruneUnusedTags()` deletes global tags
  that no longer have a single mapping (`src/utils/Tags/tag.util.ts`).
- Admin UI: `TagInput` (`src/app/(components)/utils/TagInput.tsx`) — chips with
  a small ✕, autocomplete from the master, Enter/comma to add, inline create.
  It is used by Add a product, Edit product and the variant page.
- Audit entity type: `TAG` (added to the `audit_logs.entity_type` ENUM).

## Base products

- A base product is **not purchasable** and has no price or stock of its own —
  the variants built from it are what appear on the website. The form says this
  in a notice at the top; keep that notice.
- Creating one requires **at least one category** and **at least one option with
  at least one value** — that restriction lives in `baseProductCreateSchema` and
  is enforced again in the API.
- `code` and `slug` are generated server-side from the name (unique via the
  shared slug helper + a random code suffix); the manager never types them.
- `is_featured` puts the product in the home page's featured picks;
  `main_showcase` makes it the thumbnail shown for its category.
- The write spans `products` + `product_categories` + `product_options` +
  `product_option_values` in a single transaction.
- When an option is ticked, its first value is pre-selected as the default; the
  manager can add or remove values per option.
- Validation is the shared `baseProductCreateSchema` (client parses before
  sending, the route parses again) — do not duplicate the rules in the UI.
- Form UX rule: every field that is not self-evident carries a `Hint` icon whose
  floating chip explains it, and the two meta fields have a
  “keep same as …” shortcut (`metaTitle` ← name, `metaDescription` ← brief).

## Hub (`ProductManagerClient`)

- Fed entirely by `GET /api/manager/product-studio/overview`.
- **Manage products**: Add a product (`/manager/product-studio/products/new`),
  All products, Variants & inventory.
- **Organise & curate**: Global Categories, Global Options.
- The Global Categories badge always shows the **parent** count
  (`counts.categories.root`), never the total.
- Do not re-add these removed cards: Options & values, Personalization fields,
  Features & care, Featured & showcase.

## Variants: generate → activate → disable

- Generation creates every variant **inactive**. The generate popup also warns
  that variants cannot be removed once generated, so the combinations must be
  chosen carefully.
- Activating a variant (`inactive → active`) is refused by the API unless it has
  a name (≥ 3 characters), a short description (≥ 10), a description (≥ 20) and
  at least one photo — an original upload or a shallow link. The limits live in
  `VARIANT_ACTIVATION_RULES` (`manager.productDetail.zod.ts`); the variant page
  prints them in its status hint, so never hardcode a second copy.
- Disabling a variant asks for confirmation first (`ConfirmDialog`) because it
  deletes the variant's photos to free space: its original ImageKit uploads,
  every shallow link it holds, and other variants' links to those uploads. The
  variant row itself stays, inactive.
- A variant that appears in any `order_items` row can never be disabled — the
  API answers 409 with a manager-readable sentence.
- The variant page has **no delete action**; disabling is the supported way to
  pull a variant out of the storefront. `DELETE /…/variants/[variantId]` still
  exists for tooling and keeps its own order guard.
- Disabling a **base product** asks the same confirmation, then deletes every
  variant's photos, marks every variant inactive and hides the product from the
  storefront. It is refused with 409 while any of its variants sits in an order.
- Product lists are split into **active products** and **disabled products**
  (each with its own pagination); the product page splits its variants the same
  way.

## Before you finish

- `npx tsc --noEmit` and `npx eslint <the files you touched>`.
- After adding, moving or deleting a `route.ts`, run `npx next typegen` —
  otherwise `.next/types/validator.ts` keeps importing the old path and tsc fails.
- `src/proxy.ts` redirects signed-out `/manager/*` to `/login?callbackUrl=…` and
  answers 401 for `/api/manager/*`, so a 401 proves the guard, not that a page
  renders — say which one you actually checked.
