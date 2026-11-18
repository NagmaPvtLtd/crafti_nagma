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
| `/manager/product-studio/products/new` | Add a product — create the **base** product |
| `GET /api/manager/product-studio/overview` | Counts for the hub: products, variants, categories (`total`, `root`), options, recent products |
| `GET/POST/PUT/DELETE /api/manager/product-studio/categories` | Read the category tree with totals; create, rename/move and delete |
| `GET/POST/PUT/DELETE /api/manager/product-studio/options` | Read options with their values nested; create, rename and delete |
| `POST/PUT/DELETE /api/manager/product-studio/options/values` | Add, rename and delete a value inside an option |
| `POST /api/manager/product-studio` | Create a base product with its categories, options and values |

- `api/manager/products` was merged into `api/manager/product-studio` — never
  recreate the old folder, and treat a reference to the old path as a bug.

## Files

- Page routes: `src/app/manager/product-studio/{page.tsx,categories/page.tsx,options/page.tsx,products/new/page.tsx}`
  — one-liners that render a client component.
- Page clients: `src/app/(components)/Pages/Manager/{ProductManagerClient,GlobalCategoriesClient,GlobalOptionsClient,AddProductClient}.tsx`
- Schemas + response types: `src/utils/zod/product/manager.{category,option,product}.zod.ts`
- Shared slug helper: `src/utils/Slug/slug.util.ts`

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

## Before you finish

- `npx tsc --noEmit` and `npx eslint <the files you touched>`.
- After adding, moving or deleting a `route.ts`, run `npx next typegen` —
  otherwise `.next/types/validator.ts` keeps importing the old path and tsc fails.
- `src/proxy.ts` redirects signed-out `/manager/*` to `/login?callbackUrl=…` and
  answers 401 for `/api/manager/*`, so a 401 proves the guard, not that a page
  renders — say which one you actually checked.
