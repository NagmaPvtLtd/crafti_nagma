- You know when uploading a youtube video, we are given a section where we can write tags upto ( total of 500 characters ) ?
- We write a text then press "," comma then that tag is created for that. So we are now going to do that same thing.
- We write a migration file like this `20261123082957485_product_tags.sql`
- In that we will write:

# Feature Implementation Memo: Global Tag Management & Product Tagging System

## 1. Objective

Implement a reusable, YouTube-style tagging system in Crafti Nagma's Product Studio.

The purpose is to let administrators assign searchable keywords to products so customers can discover products even when their search terms do not match the actual product name.

The system must support:

1. A centralized, globally reusable tag master.
2. Multiple tags per base product.
3. Automatic inheritance of base product tags by all its variants.
4. Additional tags exclusive to individual variants.
5. Efficient tag-based product searching.
6. Centralized tag management, including renaming and deletion.
7. Consistent tag reuse without duplicate records.

The architecture must be scalable and maintainable, following the existing Next.js App Router, TypeScript and raw MySQL architecture.

---

# 2. Architectural Decision: Global Tags, Base Product Tags & Variant-Specific Tags

Use a **global tag master with live tag inheritance**.

This is an intentional architectural decision.

The global tag master is independent of products and variants. Products and variants reference tags through separate mapping tables.

Base product tags should automatically be available to all its variants. Variant-specific tags should supplement those inherited tags.

Do not copy base product tags into every variant's mapping table.

### Example

Base Product: Charger Cover

Base Product Tags:

- Charger Protector
- Mobile Accessory
- Silicone Cover
- Cable Protection

Generated variants:

| Variant | Inherited Tags  | Additional Variant Tags              |
| ------- | --------------- | ------------------------------------ |
| Small   | All 4 base tags | None                                 |
| Medium  | All 4 base tags | Medium Charger Cover                 |
| Large   | All 4 base tags | Large Charger Cover, Oversized Cover |

### Expected behavior

| Admin action                  | Expected result                                           |
| ----------------------------- | --------------------------------------------------------- |
| Add a tag to base product     | Automatically available to every variant                  |
| Remove a base product tag     | Automatically removed from every variant's inherited tags |
| Rename a global tag           | Updated everywhere the tag is used                        |
| Add a tag to a variant        | Only that variant receives the additional tag             |
| Remove a variant-specific tag | Removed only from that variant                            |
| Edit variant tags             | Must never modify base product tags                       |
| Generate new variants         | They automatically inherit base product tags              |

### Why no Sync button?

Since base tags are inherited dynamically through database relationships, synchronization is unnecessary.

A separate Sync button would introduce redundant mappings and potential inconsistencies.

The variant editor should always show the latest base product tags automatically.

If the base product changes its tags, all variants immediately reflect those changes without additional database operations.

**Important:** Variant-specific tags must never be deleted when base product tags are changed.

---

# 3. Database Architecture

Use exactly three relational tables for the initial implementation.

## Table 1: `global_tags`

This is the centralized global tag master.

Every unique tag should exist only once, regardless of how many products or variants use it.

Do not name this table `product_tags`. It must be named `global_tags` because it is intended to be a reusable master for the entire application.

Suggested structure:

| Column       | Type            | Constraints                         |
| ------------ | --------------- | ----------------------------------- |
| `id`         | BIGINT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT         |
| `name`       | VARCHAR(100)    | NOT NULL                            |
| `slug`       | VARCHAR(120)    | NOT NULL, UNIQUE                    |
| `created_at` | TIMESTAMP       | DEFAULT CURRENT_TIMESTAMP           |
| `updated_at` | TIMESTAMP       | DEFAULT CURRENT_TIMESTAMP ON UPDATE |

Example records:

| id  | name              | slug              |
| --- | ----------------- | ----------------- |
| 1   | Charger Protector | charger-protector |
| 2   | Mobile Accessory  | mobile-accessory  |
| 3   | Silicone Cover    | silicone-cover    |
| 4   | Travel Accessory  | travel-accessory  |
| 5   | Cable Organizer   | cable-organizer   |

### Rules

- Every tag must have a unique normalized slug.
- Tag names must be trimmed before insertion.
- Prevent case-insensitive duplicate tags.
- Reuse existing tags whenever possible.
- Do not create duplicate tags for different products.
- Support global tag renaming.
- Do not allow empty tags.
- Maximum tag name length: 100 characters.
- Use database-level uniqueness constraints.
- Follow existing MySQL collation and naming conventions.

The global tag master must not contain product-specific or variant-specific ownership information.

---

## Table 2: `product_tag_mappings`

This connects global tags with base products.

Suggested structure:

| Column       | Type                        | Constraints               |
| ------------ | --------------------------- | ------------------------- |
| `product_id` | Same type as products.id    | FK                        |
| `tag_id`     | Same type as global_tags.id | FK                        |
| `created_at` | TIMESTAMP                   | DEFAULT CURRENT_TIMESTAMP |

### Constraints

- Composite primary key: `(product_id, tag_id)`.
- Foreign key to `products(id)`.
- Foreign key to `global_tags(id)`.
- Cascade deletion when the associated product is deleted.
- Index on `tag_id` for efficient reverse lookups.

A product cannot have the same tag mapped more than once.

---

## Table 3: `product_variant_tag_mappings`

This connects global tags with individual variants.

Suggested structure:

| Column       | Type                             | Constraints               |
| ------------ | -------------------------------- | ------------------------- |
| `variant_id` | Same type as product_variants.id | FK                        |
| `tag_id`     | Same type as global_tags.id      | FK                        |
| `created_at` | TIMESTAMP                        | DEFAULT CURRENT_TIMESTAMP |

### Constraints

- Composite primary key: `(variant_id, tag_id)`.
- Foreign key to `product_variants(id)`.
- Foreign key to `global_tags(id)`.
- Cascade deletion when the associated variant is deleted.
- Index on `tag_id` for efficient reverse lookups.

These mappings contain ONLY variant-specific additional tags.

Never insert inherited base product tags into this table.

### Important architectural restriction

Do not introduce a polymorphic mapping table at this stage.

Keep the two explicit mapping tables:

- `product_tag_mappings`
- `product_variant_tag_mappings`

Although the master table is global and reusable, explicit relationships are simpler, safer and easier to maintain for the current application.

A generic entity-type mapping architecture can be considered later if genuinely needed.

---

# 4. Tag Inheritance Logic

Implement tag retrieval using the relationship between the base product and its variants.

### Base product

Effective tags:

`Base Product Tags`

### Variant

Effective tags:

`Base Product Tags + Variant-Specific Tags`

Use UNION or an equivalent query to retrieve the combined tag collection without duplicates.

Example:

Base Product:

- Charger Protector
- Mobile Accessory
- Silicone Cover

Large Variant:

- Large Charger Cover
- Oversized Cover

Effective Large Variant Tags:

- Charger Protector
- Mobile Accessory
- Silicone Cover
- Large Charger Cover
- Oversized Cover

### Important rules

1. Inherited tags are read from `product_tag_mappings`.
2. Additional variant tags are read from `product_variant_tag_mappings`.
3. Do not duplicate inherited mappings.
4. Do not store inherited tags in variant records.
5. Do not create a synchronization mechanism.
6. Removing a base product tag must not delete variant-specific tags.
7. Removing a variant-specific tag must not affect base product tags.
8. Ensure variants always reference their actual parent product.

The effective tag collection should be assembled at query/service level.

---

# 5. Base Product — Admin UI

Add a new section to the base product creation/editing interface.

Section title:

**Product Tags**

Description:

"Add relevant keywords to help customers discover this product through search."

### Tag input behavior

Implement a tag input similar to YouTube's tagging interface.

Requirements:

- Admin can type a tag.
- Show autocomplete suggestions from `global_tags`.
- Existing tags should be reusable.
- If a tag does not exist, provide an option to create it.
- Pressing Enter should add the selected or newly created tag.
- Allow multiple tags.
- Show selected tags as removable chips.
- Clicking X removes the tag from the current product.
- Prevent duplicate selection.
- Trim whitespace automatically.
- Handle case-insensitive matching.

### Example UI

Product Tags

Selected:

- Charger Protector ×
- Mobile Accessory ×
- Silicone Cover ×

Input:
"Type a tag and press Enter..."

Suggestions:

- Travel Accessory
- Cable Organizer
- Phone Protection

### Limits

- Maximum 15 tags per base product.
- Maximum 100 characters per tag.
- No empty tags.
- No duplicate tags.

The maximum of 15 must be enforced server-side as well as in the UI.

### Edit mode

When editing a base product:

1. Fetch its existing tag mappings.
2. Prepopulate selected tags.
3. Allow adding existing tags.
4. Allow creating new global tags.
5. Allow removing selected tags.
6. Persist changes correctly.
7. If upon saving the product tags there are now some tags which are unused by no one then in this case we will delete them tags

Updating product tags must not modify variant-specific tag mappings.

All variants should reflect the updated base tags automatically through inheritance.

---

# 6. Variant Product — Admin UI

When opening an individual variant in Product Studio, display a dedicated Product Tags section.

The section should clearly separate inherited tags from variant-specific tags.

### Section A: Inherited from Base Product

Display all tags currently assigned to the parent base product.

Example:

Inherited from Charger Cover:

- Charger Protector
- Mobile Accessory
- Silicone Cover

Requirements:

- Display as visually distinct, preferably read-only chips.
- Do not allow removing inherited tags from the variant editor.
- Show a small label such as "Inherited".
- Always reflect the latest base product tags.
- Do not create separate database mappings for inherited tags.

### Section B: Additional Variant Tags

Allow administrators to add tags exclusive to the current variant.

Example:

Additional Tags:

- Large Charger Cover
- Oversized Cover

Requirements:

- Use the same autocomplete component.
- Reuse globally existing tags from `global_tags`.
- Allow creation of new global tags.
- Allow removing variant-specific tags.
- Prevent duplicates against both inherited and additional tags.
- Save only additional tags into `product_variant_tag_mappings`.

### Limits

- Maximum 15 additional tags per variant.
- Maximum 100 characters per tag.

The inherited and additional tag counts should be handled independently.

### Important behavior

If the parent product has 10 tags and a variant has 5 additional tags, it may have 15 effective tags.

Do not accidentally overwrite inherited tags when saving variant-specific tags.

---

# 7. Global Tag Reusability

All products and variants must use the same `global_tags` master.

Example:

Product A uses:

- Mobile Accessory
- Travel Accessory

Product B uses:

- Mobile Accessory
- Cable Organizer

Variant C uses:

- Mobile Accessory
- Large Size

There must be only one database record for `Mobile Accessory`.

Every relationship should point to the same tag ID.

### Tag creation workflow

When an admin enters a new tag:

1. Normalize and trim the input.
2. Check for an existing tag using the normalized name/slug.
3. If it exists, reuse its ID.
4. Otherwise, create a new record in `global_tags`.
5. Create the relevant product or variant mapping.
6. Handle concurrent requests safely to avoid duplicate tag records.

Use database constraints and transactions where appropriate.

Do not rely exclusively on a frontend existence check to prevent duplicates.

---

# 8. Global Tag Management (Admin)

Implement a centralized global tag management interface if it fits the existing admin navigation, just like global categories / global options.

Suggested route:

`product-studio/tags/page.tsx`

The page should provide:

- List of all existing global tags.
- Search tags by name.
- Tag usage count.
- Rename tags.
- Delete unused tags.
- Prevent accidental deletion of tags currently in use.
- Display where a tag is being used when appropriate.

### Rename behavior

Renaming a tag must update the `global_tags` record.

All associated products and variants should automatically display the updated name.

Do not create replacement tags or rebuild mappings.

When renaming a tag, regenerate its slug consistently.

Handle potential slug collisions safely. Do not silently merge two existing tags.

### Delete behavior

- Do not silently delete a tag that is in use.
- Show the number of base products and variants using it.
- Require explicit confirmation for destructive deletion ( use confirmation dialogu )
- Use existing authorization and audit-log conventions.

Unused tags can be safely deleted ( although ive already told when editing, if there is any tag which is not being used by anyone else then we'll delete it in that transaction only so maybe make a utility which we can call to trigger this? ).

---

# 9. Product Search Integration

Integrate tags into the existing customer-facing product search.

Search should match:

1. Product name.
2. Product slug, where appropriate.
3. Product description.
4. Base product tags.
5. Variant-specific tags, where variant search is supported.

### Example

Base Product: Charger Cover

Base tags:

- Charger Protector
- Mobile Accessory
- Silicone Cover

Customer searches:

| Search term       | Expected result |
| ----------------- | --------------- |
| Charger Cover     | Charger Cover   |
| Charger Protector | Charger Cover   |
| Mobile Accessory  | Charger Cover   |
| Silicone Cover    | Charger Cover   |

If the customer searches for `Large Charger Cover`, and that tag is assigned only to the Large variant, the search should still return the parent Charger Cover product.

### Search ranking

Prioritize matches in this order:

1. Exact product name match.
2. Product name prefix match.
3. Exact tag match.
4. Partial tag match.
5. Description match.

Do not let a weak tag match outrank an exact product name match.

### Query requirements

- Avoid duplicate products caused by multiple matching tags.
- Use DISTINCT, EXISTS or another efficient query strategy.
- Respect existing product publication and visibility conditions.
- Exclude deleted or inactive products according to existing application rules.
- Ensure search results do not expose unauthorized products.
- Include variant-specific tag matches where appropriate.

For initial implementation, MySQL indexed lookups and existing search infrastructure are sufficient.

Consider FULLTEXT or an external search engine only if the current search performance or catalogue size justifies it.

---

# 10. Validation and Security

Use the existing Zod validation conventions.

Validate all incoming data on the server.

Requirements:

- Validate tag IDs.
- Validate tag names.
- Enforce tag count limits.
- Reject duplicate mappings.
- Verify that a variant belongs to the requested base product.
- Verify that the admin has permission to edit the product or variant.
- Prevent unauthorized tag creation, renaming and deletion.
- Use parameterized SQL queries.
- Use transactions for multi-step mapping updates.
- Handle concurrent tag creation safely.
- Do not trust client-provided product/variant relationships.

Avoid unnecessary dependencies.

---

# 11. Performance

when searching we checking and comes to the part where it has to check tags then we'll check the product's tag and as well or like semi lazy matching type of thing.. but not too soft lazy checking, moderate lazy checking.

---

# 12. Migration Requirements

Write a proper MySQL migration that:

1. Creates `global_tags`.
2. Creates `product_tag_mappings`.
3. Creates `product_variant_tag_mappings`.
4. Adds all required foreign keys.
5. Adds primary keys and indexes.
6. Uses existing database conventions.
7. Supports safe migration on an existing production database.
8. Does not require modifying existing product or variant records.
9. Update the `src\lib\Database\Dump\LATEST_SCHEMA.sql` with whatever the current latest schema looks like after the migration is created. so real snapshot exists of the latest schema.

No data backfill is required.

Ensure all foreign key column types exactly match their referenced primary key types.

Use the project's existing migration naming and execution conventions.

---

# 13. Backward Compatibility

- Existing products must work without tags ( since tags are optional ).
- Existing variants must work without additional tags.
- Products with zero tags must remain valid.
- Variants with zero additional tags must remain valid.
- No tag should be mandatory during product creation.
- Do not modify existing category/subcategory relationships.
- Do not modify product options, variant generation, pricing, inventory, images, SKUs or product codes.
- Do not refactor unrelated Product Studio modules.

---

# 14. more ui ux and important notes:

1. When we are in add product / edit product / we can select "Choose" button and it'll load all the global tags and then we can just simply select all the tags we want to integrate into this product and then click on save, then all those tags would be written in the global tags. :3 a nice cool thing
2. When we search something then the the desktop layout of the final search page ( which is in this route app/search/page.tsx ) it would be like this:
   a: on the left side it would show only price filtering option to select slider to adjust pricing
   b: on the right side it would show card like products to open
   c: and above the right side slightly it will give some space and there would be written what they wrote and what query string is being served. for example: Searched for "gift for girlfriend" - X & when someone press this x then it'll remove the search query and the product population which populated on the right side would be removed and then it'll simply write: "Search to show products! " or something like that.
3. On the mobile it would be simple, when we click on search icon on top a search bar appears so below it, would be the filters which we can scroll horitzontally, below that would be the searched query string, below that would be the products being populated either 1 product per row or 2 product per row based on the screen.

4. When we open a product public page then in there there would be no mentino of any frontend showing tags / backend sending back tags. it is meant to improve search result only. so user has no need to see that.
5. In the admin base product page, show tha tags , in the variant page also show the tags ok?
6. The tags should be like chips which are like ( flex-wrap & items-center ) with a small X on the right side of it so upon clicking it will simply get removed whatever the context of that X remains on that part of the project at that time. i was just telling an example

---

# 15. Development Instructions

Before implementation:

1. Inspect the existing MySQL schema.
2. Inspect product and product_variant primary key types.
3. Inspect Product Studio's base product creation and editing workflows.
4. Inspect variant creation and editing workflows.
5. Inspect the existing product search implementation.
6. Inspect authentication, authorization, validation and audit-log patterns.
7. Follow existing naming and directory conventions.

Implement this feature with minimal, focused changes.

Do not introduce Prisma or another ORM. Continue using the existing raw MySQL data-access architecture.

Do not create unnecessary abstractions or refactor unrelated code.

After implementation, report:

- Complete migration SQL.
- Modified and newly created files.
- Database relationship explanation.
- Base product and variant tag behavior.
- Search implementation and ranking.
- Tests performed.
- Manual migration or deployment steps.
- Remaining limitations.

## Final Architectural Principle

`global_tags` is the centralized source of truth for all tag names.

`product_tag_mappings` connects global tags to base products.

`product_variant_tag_mappings` connects global tags to additional variant-specific tags.

Effective variant tags = Base Product Tags + Variant-Specific Tags.

Never duplicate inherited tag mappings, never require synchronization, and never allow variant-specific changes to modify base product tags.

The global tag master must remain independent of product ownership so that it can be reused by other application entities in the future.

Prioritize data consistency, tag reuse, search performance, security and long-term maintainability.
