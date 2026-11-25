# Storefront collections — routes, data flow and UI/UX structure

This document explains how the public **collections** area works end to end: the
four routes, the two public APIs feeding them, the components that render them,
and the UI decisions behind each screen. It describes the code as it stands
today; nothing here is planned work except the section marked **TODO**.

Related files:

| Layer | File |
| --- | --- |
| Landing page | `src/app/(components)/Pages/Collections.tsx` |
| Category / subcategory page | `src/app/(components)/Pages/CollectionBrowse.tsx` |
| Single product page | `src/app/(components)/Pages/CollectionProduct.tsx` |
| Shared product card | `src/app/(components)/Pages/CollectionCard.tsx` |
| Full-screen photo viewer | `src/app/(components)/utils/PhotoViewer.tsx` |
| API — list / tree | `src/app/api/public/collections/route.ts` |
| API — one product | `src/app/api/public/collections/product/route.ts` |
| Shared DTOs | `src/types/Collection.types.ts` |

---

## 1. Routes

| Route | File | Renders |
| --- | --- | --- |
| `/collections` | `src/app/collections/page.tsx` | `Collections` |
| `/collections/[category]` | `src/app/collections/[category]/page.tsx` | `CollectionBrowse` |
| `/collections/[category]/[subcategory]` | `src/app/collections/[category]/[subcategory]/page.tsx` | `CollectionBrowse` (with `subcategory`) |
| `/collections/[category]/[subcategory]/[product]` | `src/app/collections/[category]/[subcategory]/[product]/page.tsx` | `CollectionProduct` |
| `/search` | `src/app/search/page.tsx` | `SearchProducts` |

Route files stay thin: they `await params` (Next 16 async params), pass the
segments through, and nothing else. All fetching, state and layout live in the
client components.

### URL conventions

- Product links are always `/collections/{category}/{subcategory}/{productCode}`,
  built **server-side** by the API (`productHref`) and shipped as `href` on each
  product. Components never assemble these paths themselves.
- When a product has no root category the segment is `all`; when it has no
  subcategory the segment is `all` too. So an uncategorised product lives at
  `/collections/all/all/{code}`.
- `{product}` is the **product code** (`CHAR-P2600-XXXX`), not a database id,
  URL-encoded on build and `decodeURIComponent`-ed in the page.
- The open variant is carried in `?variant={sku}`. The page opens on the SKU in
  the URL (falling back to the product's default variant), rewrites the address
  bar to that SKU on load, and rewrites it again on every option change — so a
  copied link reopens exactly the variant it was copied from.
- Category and subcategory pages look products up by **slug**, case-insensitively.
- The category/subcategory segments in the product URL are decorative for the
  lookup (`?code=` is what matters) — they exist so the breadcrumb matches the
  path a shopper sees.

---

## 2. Data flow

```
                    ┌───────────────────────────────────────┐
/collections ───────► GET /api/public/collections              │
                    │  featured + category tree + products  │
/collections/A ─────► GET /api/public/collections?category=A   │
                    │  products scoped to A (subcats incl.) │
/collections/A/B ───► GET /api/public/collections              │
                    │  ?category=A&subcategory=B            │
                    └───────────────────────────────────────┘
                                  │  (axios, no auth)
product page ───────► GET /api/public/collections/product
                       ?code=CHAR-P2600-XXXX&variant=CHAR-P2601-XXXX-RED
```

Both endpoints are **public and unauthenticated** — they sit under
`/api/public/...`, so `src/proxy.ts` does not gate them. Only `products.status =
'active'` rows are ever returned, and only `status = 'active'` variants are
counted in prices and stock.

### `GET /api/public/collections`

Query params (all optional):

| Param | Meaning |
| --- | --- |
| `category` | root category **slug**; `all` or empty means "everything" |
| `subcategory` | subcategory **slug**; if present it wins over `category` |

Response (`CollectionsResponse`):

- `featured` — up to 8 featured products. **Empty when a scope is applied**, so
  the browse pages don't repeat the landing page's featured strip.
- `categories` — the root category tree. Each root carries `productCount`
  (products filed directly on it), `totalProductCount` (itself + every
  subcategory) and a `subcategories[]` array where each entry has its own
  `productCount` and `href`.
- `products` — the scoped (or full) product list, newest/most ordered first.
- `totalProducts` — size of the **whole** catalogue, not the current scope.
- `scope` — `null` for the unscoped call; otherwise `{ type, name, slug, found }`.
  `found: false` is how the browse page knows to show "Category not found".

Each `CollectionProduct` carries `priceFrom` / `priceTo` (min/max across active
variants), the lowest `compareAtPrice`, summed `totalStock`, one thumbnail, its
`category` / `subcategory` refs and the ready-made `href`.

Thumbnail preference: product-level image first, otherwise the first variant
photo with an active variant preferred.

### `GET /api/public/collections/product?code=…&variant=…`

`code` accepts the product code, the slug, or the raw id (first match wins).
`variant` is optional and accepts a variant **SKU** (or its raw id) — it picks
which variant's data comes back. Missing/over-long code → `400`, unknown
product → `404`. An unknown `variant` does **not** 404: it falls back to the
default variant so an old share link still opens the product.

Only **one variant** is loaded per request. The response has three parts:

- `product` (`CollectionProductDetail`) — the product-level shell that is the
  same whichever variant is open: name, brief/description, `options` and their
  values, category refs, `processingTime`, `deliveryCharges`, `features`,
  `careInstructions`, `giftIncluded` (sorted by `sort_order`), the approved
  `reviews { average, count }` summary, and the product-level photo fallback.
- `variant` (`CollectionVariant | null`) — the full row for the resolved SKU:
  price, compare-at, stock, weight, status, its own copy and **its own images**
  (falling back to the product gallery when it has none), plus its
  `optionValueIds`. `null` only when the product has no variants at all.
- `variants` (`CollectionVariantRef[]`) — the SKU skeleton of every variant:
  `id`, `sku`, `status` and `optionValueIds`, nothing else. The option chips use
  it to map a combination to a SKU and to grey out combinations that would leave
  no active variant.

Variant resolution: matching SKU/id first, then the first active variant with
`stock > 0`, then the first active variant, then the first variant of any
status.

Changing an option does not swap anything client-side — the page resolves the
matching SKU, puts it in `?variant=`, and the backend sends that variant's data.

### Tables touched

`products`, `product_variants`, `product_options`, `product_option_values`,
`variant_option_values`, `product_categories`, `categories` (self-joined for the
parent name/slug), `product_features`, `product_care_instructions`,
`product_gift_included`, `product_reviews`, `imagekit_files`.

Images always come from `imagekit_files` with `entity_type = 'product'` (product
fallback gallery) or `entity_type = 'product_variant'` +
`file_purpose = 'product_variant_image'`, ordered by `sort_order`.

---

## 3. UI/UX structure

### 3.1 `/collections` — the landing page

Reading order is deliberate: **Featured Products → All Categories → All Products
links**.

1. **Header** — eyebrow "Collections · live catalogue", title "Everything on the
   shelf.", one line of orientation, then three small pills: product count,
   category count, and a jump link to `#products`.
2. **Featured Products** — "Picked for you" + count, responsive card grid
   (1 / 2 / 3 / 4 columns). Empty state is a dashed note, never an empty gap.
3. **All Categories** — one card per root category: name + total product count
   with an arrow, then the subcategories as small count-bearing chips. A root
   with no children says "No subcategories" instead of rendering nothing.
4. **All Products** — a search field (filters by name, product code, category or
   subcategory — case-insensitive, client-side, clear button) and a compact
   link list: thumbnail, name, "Category · Subcategory", price (or range) and a
   "Sold out" flag. Search empty state explains what it searched and offers
   "Clear search".

The whole page is inside `PageWrapper variant="hero"` with two soft rose blobs,
per the shared UI/UX doc. Copy on this page talks to a shopper only — the words
"studio", "manager" and "admin" never appear on a public surface.

### 3.2 `/collections/[category]` and `/[subcategory]` — browse

1. **Breadcrumb** — Home › Collections › (root category when a subcategory is
   open) › current scope.
2. **Header** — eyebrow "Category" or "Subcategory", the scope name as the
   `h1`, one orienting line. If the slug doesn't exist (`scope.found === false`)
   the title becomes "Category not found" and the copy says so.
3. **Scope chips** — "All {Category}" plus every subcategory of the root,
   each with its product count. The active chip is rose-tinted; clicking moves
   between the category page and its subcategory pages without a detour.
4. **Product grid** — same `CollectionCard` as the landing page, with a
   "N products" line and a link back to all collections. Empty, error and
   loading states are explicit (`CustomLoader`, inline error banner, dashed
   empty card with a CTA).

A category page shows everything in that category **including** its
subcategories' products; a subcategory page shows only its own.

### 3.3 `/collections/{category}/{subcategory}/{code}` — single product

Amazon-style reading order, all of it top-to-bottom in one column:

1. **Breadcrumb** — Home › Collections › Category › Subcategory › product name.
2. **Two-column block** (stacks on mobile):
   - **Gallery** — 4:3 panel on a rose/amber gradient, the selected variant's
     photos, a discount badge top-left when `compareAtPrice > price`, previous /
     next arrows and a `current / total` counter when there is more than one
     photo, and a thumbnail strip underneath. Clicking the photo or the `⤢`
     button opens the **full-screen `PhotoViewer`** (white canvas, arrows, swipe,
     arrow keys, Esc, thumbnails); it shares the same index, so closing returns
     you to the photo you were on.
   - **Details** — category · subcategory eyebrow, product name, **star row
     directly under the title** (average + review count, or "No reviews yet",
     vertically centred with the stars), featured pill, short description,
     price with strikethrough compare-at and "Save X%", then the availability
     badge.
3. **Availability wording** (only stock counts are public):

   | Stock | Badge |
   | --- | --- |
   | ≥ 15 | `Only 20 left in stock!` |
   | 5 – 14 | `Only a few left in stock!` |
   | 1 – 4 | `Low stock! Hurry up!` |
   | 0 | `Out of stock` |
   | inactive variant | `Currently unavailable` |

4. **Options** — one row per `product_option`, chips per value, the selected one
   rose-tinted with a ring. Values that would leave **no active variant** behind
   are disabled and struck through, so an impossible combination can't be picked.
   Picking a value resolves that combination's SKU, writes it to `?variant=` and
   fetches the variant again, so image, price, stock, description and
   availability all come from the backend (the panel dims while it loads).
5. **Two small info pills** — processing time and the variant name, when present.
6. **Product Description** — fixed heading (no variant name in it); the selected
   variant's values sit as a small muted label on the right. The variant's own
   description wins over the product's, `whitespace-pre-line` keeps the author's
   line breaks, and the variant SKU appears as a quiet `Product ID: …` line after
   the text (no code/SKU anywhere else on the page).
7. **Product Features → Product Care Instructions → Gift Includes** — stacked
   full-width cards, each a checked list, each omitted entirely when empty.
8. **Specifications** — two-column `<dl>`: option name(s) + selected values,
   Category, Subcategory (separate rows), Weight in grams, Processing time.
   Every missing value renders an em dash (`—`), never a blank.
9. **Reviews** — a dashed "Under construction" panel that still shows the live
   average/count. **TODO(reviews):** replace it with paginated approved reviews
   from `product_reviews`, a rating breakdown, helpful votes and a submit form.
10. **Footer strip** — "Back to {category}" and "All collections".

Loading uses `CustomLoader fullScreen={false}`; a 404 shows "This product does
not exist or is no longer available." with a way back; any other failure shows a
retry-free friendly message and the same escape link.

### 3.4 `CollectionCard`

One card, reused by the landing page, category and subcategory grids: gradient
image area (or flower placeholder), "Featured" pill, "Sold out" pill, category ·
subcategory eyebrow, name, two-line truncated blurb, price (single or range via
`productPriceLabel`) and a "View" pill. The code/SKU is never shown here.

### 3.5 `PhotoViewer`

Shared full-screen viewer used by the storefront gallery and the manager's
`MediaGallery`. Props: `open`, `onClose`, `images`, `index`, `onIndexChange`,
`title`. It portals to `document.body` (so sticky page chrome such as the z-40
navbar can't cover it), locks body scroll, wires ArrowLeft/ArrowRight/Escape,
handles horizontal swipe for touch, and keeps a thumbnail strip at the bottom.

---

## 4. Conventions this area follows

- `PageWrapper` is the outermost wrapper of every page here (`variant="hero"`,
  `position="fixed"`), plus `SectionDivider` / `SectionEyebrow` and the
  `mx-auto max-w-7xl px-4 sm:px-6` rhythm from the landing page.
- `CustomLoader` only — no bespoke spinners or skeletons.
- Cards/panels: `rounded-2xl sm:rounded-3xl`, `border-rose-100 bg-white/85
  backdrop-blur-sm`, rose accents (`rose-500/600`, `rose-50`), stone text.
- Prices always go through `formatCurrency()`.
- Images are `<Image />` from `next/image` (`fill` inside a `relative` box,
  with `sizes`); internal links are `<Link />`. See `README_PROJECT_HABIT.md`.
- Errors are human sentences rendered as-is; the API never leaks SQL or stack
  details to the storefront.

---

## 6. Display rules the card/listing data follows

The collection cards, the browse grids and the search results always show a
**base product** — never a raw variant name — but they borrow one variant's
commercial data so the card matches what the shopper can actually buy:

| Field | Source |
| --- | --- |
| Name | base product name |
| Brief / description | base product copy |
| Reviews / stars | every approved review of the product, all variants combined (`{ average, count }`) |
| Thumbnail | first photo of the **featured** variant (`product_variants.is_featured = 1`); fallback: the first variant's first photo |
| Price / compare-at | the same **featured** variant; fallback: the first variant |

`/api/public/collections` computes all of this in SQL (`display_price`,
`display_compare_at`, `variant_image`, `review_count`, `review_average`) and
returns `priceFrom === priceTo` for a single-variant price.

## 7. Tag-aware search

`GET /api/public/collections` accepts:

| Param | Meaning |
| --- | --- |
| `search` (or `q`) | matches name, slug, code, brief description, base-product tags and variant-specific tags |
| `minPrice` / `maxPrice` | filters by the displayed variant price |
| `category` / `subcategory` | unchanged scope filters |

The response also carries `priceRange` (catalogue-wide active-variant min/max,
for the search slider) and `query` (the term served). Ranking is strict, so a
weak tag match never outranks a name match:

1. exact product name · 2. name prefix · 3. name contains · 4. exact tag ·
5. tag contains · 6. slug/code · 7. description.

Tags are never returned on the public product page — they only improve
discovery.

## 8. `/collections` landing layout

1. **Featured products** — a full-width panel with a large heading and an
   Embla carousel (`embla-carousel-react`, `{ dragFree: true }`) of square
   product cards, plus previous/next controls.
2. **Categories** — cards using each root category's `thumbnailUrl` (featured
   variant first, then the first variant photo of a product in that category),
   with the total product count and its subcategory chips.
3. **Search + all products** — the search field pushes to
   `/search?q=<term>`; below it the products render as a square-card grid and
   the next batch of 8 is revealed by an `IntersectionObserver` sentinel well
   before the shopper reaches the bottom, so scrolling never waits.

### Empty states — hide the block, do not fill it with an apology

A section that has nothing to show is not rendered at all: no placeholder card,
no "nothing here yet" note, and no `SectionDivider` left behind to float in
space.

| Situation | What renders |
| --- | --- |
| `featured.length === 0` | The whole **Featured** section (heading, controls, divider) is skipped. |
| No categories, or categories exist but every one has `totalProductCount === 0` | The whole **Categories** section is skipped — `categories` is filtered to `totalProductCount > 0` before rendering. |
| `products.length === 0` | The search field stays, followed by a single centred card: "No products yet" + a shopper-facing line ("Our shelves are being restocked — new handmade pieces will show up here soon."). No internal/studio wording. |

The dividers between sections are conditional for the same reason: the
Featured→Categories divider only renders when *both* sections do, and the
Categories→All-products divider only when Categories renders.

## 9. `/search` page

Desktop: a sticky **price** filter on the left (min/max range inputs), the
result grid on the right, and a query line above it — `Searched for “X”` with
an ✕ that clears the query and the results, falling back to
`Search to show products!`.

Mobile: the filters scroll horizontally under the search bar, then the query
line, then a two-column grid of cards.

## 10. Product page interaction rules

- The heading is the **variant** name (`variant.name || product.name`); the
  brief and description come from the variant first, then the base product.
- The old “You are currently viewing: …” block is gone.
- The purchase row has a quantity stepper (max **99**), an Add to Cart button
  that answers “coming soon”, and a square WhatsApp button.
- Asking above 99 shows: **“Bulk orders above 99 pieces are subject to terms
  and conditions and take longer to deliver.”**
- The WhatsApp message is prefilled:
  `Hello, crafti nagma. I am interest in this product of yours!` + product name
  + product ID (the variant SKU).

---

## 5. Known gaps

- **Old product codes are not backfilled.** Products created before the
  `CHAR-P2600-{last4}` scheme still carry their original code (e.g. `TEST-01M7`),
  and their URLs use it. New products and new variant SKUs are generated by
  `src/utils/Formator/productIdentity.util.ts`.
- **Product code prefixes are now random, not positional.** The `PREFIX` part of a
  product code / variant SKU is no longer the first four letters of the name. Instead
  `productCodePrefix(name)` picks four random distinct alphanumeric characters from the
  whole name (skipping spaces/punctuation, never repeating the same letter), uppercased,
  and pads with `X` when the name has fewer than four distinct letters. The same name can
  therefore produce different prefixes on different creations (e.g. `CHARGER COVER` may give
  `AGE-...` instead of `CHAR-...`).
- **Delivery charges are intentionally not shown** on the storefront product page
even though the API returns them.
- **Reviews module** is a placeholder (see the TODO in `CollectionProduct.tsx`).
