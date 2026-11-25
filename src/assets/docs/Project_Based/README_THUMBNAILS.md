# Thumbnails — which photo is picked, and why

Scope: every place the catalogue shows **one** photo to represent a product,
variant or category. General rules are **not** repeated here — see
`README_API_STRUCTURE.md` and `README_UI_UX.md`.

All photos live in `imagekit_files`. Two entity kinds matter:

| `entity_type` | `entity_id` | `file_purpose` | Belongs to |
|---|---|---|---|
| `product` | `products.id` | `product_image` | the base product |
| `product_variant` | `product_variants.id` | `product_variant_image` | one variant |

`sort_order` is the display order inside its owner (0 is the cover). The media
reorder endpoint rewrites the whole sequence from 1…n, so it is always
contiguous, and a newly uploaded photo is appended with the next value.

## The one rule everything shares

> **Product-level photo first, first variant photo second, placeholder last.**

"First" always means **lowest `sort_order`, then oldest `created_at`, then
`id`** — never the newest upload, never a random row. `id` is the tie-break so
two photos ordered in the same second still resolve deterministically.

## Scenario by scenario

### 1. Product card — manager "All products" and hub "Recently updated"

`GET /api/manager/product-studio/products` and
`GET /api/manager/product-studio/overview`

```sql
(SELECT f.url FROM imagekit_files f
  WHERE f.entity_type = 'product' AND f.entity_id = p.id
  ORDER BY f.sort_order ASC, f.created_at ASC, f.id ASC
  LIMIT 1)                                   -- product_image

(SELECT f.url FROM imagekit_files f
   JOIN product_variants v ON v.id = f.entity_id
  WHERE f.entity_type = 'product_variant'
    AND f.file_purpose = 'product_variant_image'
    AND v.product_id = p.id
  ORDER BY v.status = 'active' DESC,
           f.sort_order ASC, f.created_at ASC, f.id ASC
  LIMIT 1)                                   -- variant_image
```

Then `imageUrl = product_image ?? variant_image ?? null`.

- A base product with its own cover always wins.
- Otherwise the first variant photo, with **active variants preferred** — an
  inactive variant's photo is only used when no active variant has one, so
  pulling a variant out of the storefront does not blank the card.
- `null` renders the placeholder (`Package` icon, `bg-stone-100`).

### 2. Product card — public storefront (`/collections`, `/search`)

`GET /api/public/collections`

Variant photos only, with the featured variant first:

```sql
ORDER BY v.is_featured DESC, v.status = 'active' DESC,
         f.sort_order ASC, f.created_at ASC, f.id ASC
```

- The storefront deliberately shows a **variant** photo because that variant's
  price is the price on the card — the card must advertise what it sells.
- It does **not** fall back to product-level photos, so an active product with
  no variant photo shows the `Flower2` placeholder. Variant activation already
  requires at least one photo (`VARIANT_ACTIVATION_RULES`), so this only hits
  inactive variants.

### 3. Category thumbnail — storefront category slider

`GET /api/public/collections` (`CATEGORY_SELECT`)

Any product **inside the category or its sub categories**, ordered:

```sql
ORDER BY p2.is_featured DESC, v2.is_featured DESC, v2.status = 'active' DESC,
         f.sort_order ASC, f.created_at ASC, f.id ASC
```

- Featured products represent a category before ordinary ones; the featured
  variant of a product beats a pending one.
- Only `product_variant` photos are considered here — a category whose products
  have only product-level photos shows the placeholder.

### 4. Variant row thumbnail — variant page and product detail

`GET /api/manager/product-studio/[id]` (variant list) and
`GET /api/manager/product-studio/[id]/variants/[variantId]`

The variant's **own** photos, `ORDER BY sort_order, created_at` — no fallback
to other variants and no product-level fallback. `null` renders the `Layers`
placeholder.

### 5. Storefront product page gallery

`GET /api/public/collections/product`

1. Variant photos of the requested variant, in `sort_order`.
2. If that variant has none, the **product-level** photos, in `sort_order`.
3. If neither exists, the gallery is empty.

The product payload's own `images` array is always the product-level set.

### 6. `is_featured` / `main_showcase` — how they relate

- `is_featured` sorts a product ahead of others **inside its category
  thumbnail**, and a variant ahead of others **inside a product card**.
- `main_showcase` is stored on `products` and `product_variants`, but **no
  thumbnail query reads it yet** — the "make this the category thumbnail" flag
  from `README_PRODUCT_STUDIO.md` is not wired into the SQL above. Do not
  assume it applies; the ordering is the one written here.

## Placeholders

| Surface | Placeholder |
|---|---|
| Storefront product card / product page | `Flower2` (`text-rose-300`) |
| Manager product row (list + hub) | `Package` (`text-stone-300`) |
| Manager variant row | `Layers` (`text-stone-300`) |

Manager thumbnails are always a fixed square (`h-9 w-9` in the hub list,
`h-12 w-12 sm:h-14 sm:w-14` in All products, `h-10 w-10` on variant rows) with
`next/image fill` + `object-cover` inside a `relative` box — a `fill` image in a
box without a height collapses to zero pixels, so never drop the size classes.

## Adding a new surface

1. Copy the two subqueries from §1 — do not invent a third ordering and do not
   read `created_at DESC`.
2. Expose it as `imageUrl: product_image ?? variant_image ?? null`, and add the
   field to the response's JSDoc `@returns`.
3. Render it with `next/image fill` + `sizes` matching the box, and keep the
   existing placeholder icon for `null`.
4. If the surface sells a specific variant (price, SKU), use that variant's
   photos instead of the product-level one — see §2.
