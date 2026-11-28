# File tree: crafti_nagma

Generated from the working tree (directories first, then files, both alphabetical).
`node_modules`, `.next`, `.git`, `.vercel`, `coverage`, `.env*` files and
`src/assets/TODO/Brainstorming` are skipped.

```
├── 📁 .freebuff
│   ├── 📄 .gitignore
│   └── 📄 project-id
├── 📁 .vscode
│   └── ⚙️ settings.json
├── 📁 public
│   ├── 📁 assets
│   │   ├── 🖼️ avatar_v1.png
│   │   ├── 🖼️ bg_white.jpg
│   │   └── 🖼️ logo_v1.png
│   ├── 📄 admin_product_management_flow.docx
│   ├── 📝 dynamic-product.md
│   ├── 📝 Flow.md
│   └── 📄 rbac.excalidraw
├── 📁 src
│   ├── 📁 app
│   │   ├── 📁 (components)
│   │   │   ├── 📁 About
│   │   │   │   └── 📄 AboutLayout.tsx
│   │   │   ├── 📁 Navbar
│   │   │   │   ├── 📄 CartBadge.tsx
│   │   │   │   ├── 📄 Navbar.tsx
│   │   │   │   ├── 📄 NavbarClient.tsx
│   │   │   │   └── 📄 navLinks.ts
│   │   │   ├── 📁 Pages
│   │   │   │   ├── 📁 Admin
│   │   │   │   │   ├── 📄 AuditLogClient.tsx
│   │   │   │   │   ├── 📄 DashboardClient.tsx
│   │   │   │   │   └── 📄 UserManagerClient.tsx
│   │   │   │   ├── 📁 Dashboard
│   │   │   │   │   ├── 📄 OrdersClient.tsx
│   │   │   │   │   ├── 📄 ProfileClient.tsx
│   │   │   │   │   └── 📄 WishlistClient.tsx
│   │   │   │   ├── 📁 Manager
│   │   │   │   │   ├── 📄 AddProductClient.tsx
│   │   │   │   │   ├── 📄 EditProductClient.tsx
│   │   │   │   │   ├── 📄 ExistingPhotosModal.tsx
│   │   │   │   │   ├── 📄 GlobalCategoriesClient.tsx
│   │   │   │   │   ├── 📄 GlobalOptionsClient.tsx
│   │   │   │   │   ├── 📄 GlobalTagsClient.tsx
│   │   │   │   │   ├── 📄 ManagerDashboardClient.tsx
│   │   │   │   │   ├── 📄 PricingQuizModal.tsx
│   │   │   │   │   ├── 📄 ProductDetailClient.tsx
│   │   │   │   │   ├── 📄 ProductListClient.tsx
│   │   │   │   │   ├── 📄 ProductManagerClient.tsx
│   │   │   │   │   ├── 📄 ProductMediaManager.tsx
│   │   │   │   │   ├── 📄 StudioModal.tsx
│   │   │   │   │   └── 📄 VariantDetailClient.tsx
│   │   │   │   ├── 📄 CartClient.tsx
│   │   │   │   ├── 📄 CollectionBrowse.tsx
│   │   │   │   ├── 📄 CollectionCard.tsx
│   │   │   │   ├── 📄 CollectionProduct.tsx
│   │   │   │   ├── 📄 Collections.tsx
│   │   │   │   ├── 📄 Landing.tsx
│   │   │   │   ├── 📄 LoginClient.tsx
│   │   │   │   └── 📄 SearchProducts.tsx
│   │   │   ├── 📁 Policy
│   │   │   │   └── 📄 PolicyLayout.tsx
│   │   │   ├── 📁 Providers
│   │   │   │   └── 📄 Imagekit.Provider.tsx
│   │   │   ├── 📁 utils
│   │   │   │   ├── 📁 Form
│   │   │   │   │   ├── 📄 DimensionFields.tsx
│   │   │   │   │   ├── 📄 Field.tsx
│   │   │   │   │   ├── 📄 fieldStyles.ts
│   │   │   │   │   ├── 📄 formErrors.ts
│   │   │   │   │   ├── 📄 PasswordInput.tsx
│   │   │   │   │   ├── 📄 Textarea.tsx
│   │   │   │   │   └── 📄 TextInput.tsx
│   │   │   │   ├── 📁 Hooks
│   │   │   │   │   └── 📄 useDebouncedValue.ts
│   │   │   │   ├── 📄 ConfirmDialog.tsx
│   │   │   │   ├── 📄 ErrorState.tsx
│   │   │   │   ├── 📄 ogImage.tsx
│   │   │   │   ├── 📄 PageWrapper.tsx
│   │   │   │   ├── 📄 PhotoViewer.tsx
│   │   │   │   ├── 📄 ScrollToTop.tsx
│   │   │   │   ├── 📄 SectionDiv.tsx
│   │   │   │   ├── 📄 SocialIcons.tsx
│   │   │   │   ├── 📄 TagInput.tsx
│   │   │   │   ├── 📄 TrendChart.tsx
│   │   │   │   └── 📄 WhatsappFloating.tsx
│   │   │   ├── 📄 CustomLoader.tsx
│   │   │   ├── 📄 Footer.tsx
│   │   │   ├── 📄 GoBack.tsx
│   │   │   └── 📄 MetricChartCard.tsx
│   │   ├── 📁 about
│   │   │   └── 📄 page.tsx
│   │   ├── 📁 admin
│   │   │   ├── 📁 audit-logs
│   │   │   │   └── 📄 page.tsx
│   │   │   ├── 📁 dashboard
│   │   │   │   └── 📄 page.tsx
│   │   │   ├── 📁 settings
│   │   │   │   └── 📄 page.tsx
│   │   │   ├── 📁 user-manager
│   │   │   │   └── 📄 page.tsx
│   │   │   └── 📄 page.tsx
│   │   ├── 📁 api
│   │   │   ├── 📁 admin
│   │   │   │   ├── 📁 audit-logs
│   │   │   │   │   └── 📄 route.ts
│   │   │   │   ├── 📁 dashboard
│   │   │   │   │   └── 📄 route.ts
│   │   │   │   ├── 📁 settings
│   │   │   │   │   ├── 📁 [fieldName]
│   │   │   │   │   │   └── 📄 route.ts
│   │   │   │   │   └── 📄 route.ts
│   │   │   │   └── 📁 users
│   │   │   │       ├── 📁 [userId]
│   │   │   │       │   └── 📄 route.ts
│   │   │   │       └── 📄 route.ts
│   │   │   ├── 📁 admin-super
│   │   │   ├── 📁 auth
│   │   │   │   ├── 📁 [...nextauth]
│   │   │   │   │   └── 📄 route.ts
│   │   │   │   └── 📁 profile
│   │   │   │       ├── 📁 update
│   │   │   │       │   └── 📄 route.ts
│   │   │   │       └── 📄 route.ts
│   │   │   ├── 📁 manager
│   │   │   │   └── 📁 product-studio
│   │   │   │       ├── 📁 [id]
│   │   │   │       │   ├── 📁 variants
│   │   │   │       │   │   ├── 📁 [variantId]
│   │   │   │       │   │   │   ├── 📁 available-images
│   │   │   │       │   │   │   │   └── 📄 route.ts
│   │   │   │       │   │   │   ├── 📁 linked-images
│   │   │   │       │   │   │   │   └── 📄 route.ts
│   │   │   │       │   │   │   └── 📄 route.ts
│   │   │   │       │   │   └── 📄 route.ts
│   │   │   │       │   └── 📄 route.ts
│   │   │   │       ├── 📁 categories
│   │   │   │       │   └── 📄 route.ts
│   │   │   │       ├── 📁 media
│   │   │   │       │   └── 📄 route.ts
│   │   │   │       ├── 📁 options
│   │   │   │       │   ├── 📁 values
│   │   │   │       │   │   └── 📄 route.ts
│   │   │   │       │   └── 📄 route.ts
│   │   │   │       ├── 📁 overview
│   │   │   │       │   └── 📄 route.ts
│   │   │   │       ├── 📁 products
│   │   │   │       │   └── 📄 route.ts
│   │   │   │       ├── 📁 tags
│   │   │   │       │   ├── 📁 [tagId]
│   │   │   │       │   │   └── 📄 route.ts
│   │   │   │       │   └── 📄 route.ts
│   │   │   │       └── 📄 route.ts
│   │   │   ├── 📁 public
│   │   │   │   ├── 📁 collections
│   │   │   │   │   ├── 📁 product
│   │   │   │   │   │   └── 📄 route.ts
│   │   │   │   │   └── 📄 route.ts
│   │   │   │   └── 📁 heartbeat
│   │   │   │       └── 📄 route.ts
│   │   │   └── 📁 user
│   │   │       └── 📁 cart
│   │   │           ├── 📁 items
│   │   │           │   ├── 📁 [variantId]
│   │   │           │   │   └── 📄 route.ts
│   │   │           │   └── 📄 route.ts
│   │   │           └── 📄 route.ts
│   │   ├── 📁 care-guide
│   │   │   └── 📄 page.tsx
│   │   ├── 📁 cart
│   │   │   └── 📄 page.tsx
│   │   ├── 📁 collections
│   │   │   ├── 📁 [category]
│   │   │   │   ├── 📁 [subcategory]
│   │   │   │   │   ├── 📁 [product]
│   │   │   │   │   │   └── 📄 page.tsx
│   │   │   │   │   └── 📄 page.tsx
│   │   │   │   └── 📄 page.tsx
│   │   │   └── 📄 page.tsx
│   │   ├── 📁 dashboard
│   │   │   ├── 📁 custom-order
│   │   │   │   └── 📄 page.tsx
│   │   │   ├── 📁 orders
│   │   │   │   └── 📄 page.tsx
│   │   │   ├── 📁 profile
│   │   │   │   └── 📄 page.tsx
│   │   │   ├── 📁 wishlist
│   │   │   │   └── 📄 page.tsx
│   │   │   └── 📄 page.tsx
│   │   ├── 📁 how-it-is-made
│   │   │   └── 📄 page.tsx
│   │   ├── 📁 login
│   │   │   ├── 📄 opengraph-image.tsx
│   │   │   └── 📄 page.tsx
│   │   ├── 📁 manager
│   │   │   ├── 📁 dashboard
│   │   │   │   └── 📄 page.tsx
│   │   │   └── 📁 product-studio
│   │   │       ├── 📁 categories
│   │   │       │   └── 📄 page.tsx
│   │   │       ├── 📁 options
│   │   │       │   └── 📄 page.tsx
│   │   │       ├── 📁 products
│   │   │       │   ├── 📁 [product_id]
│   │   │       │   │   ├── 📁 edit
│   │   │       │   │   │   └── 📄 page.tsx
│   │   │       │   │   ├── 📁 variants
│   │   │       │   │   │   └── 📁 [variant_id]
│   │   │       │   │   │       └── 📄 page.tsx
│   │   │       │   │   └── 📄 page.tsx
│   │   │       │   ├── 📁 new
│   │   │       │   │   └── 📄 page.tsx
│   │   │       │   └── 📄 page.tsx
│   │   │       ├── 📁 tags
│   │   │       │   └── 📄 page.tsx
│   │   │       └── 📄 page.tsx
│   │   ├── 📁 policy
│   │   │   ├── 📁 cancellation-refund
│   │   │   │   ├── 📄 opengraph-image.tsx
│   │   │   │   └── 📄 page.tsx
│   │   │   ├── 📁 privacy
│   │   │   │   ├── 📄 opengraph-image.tsx
│   │   │   │   └── 📄 page.tsx
│   │   │   └── 📁 terms-of-service
│   │   │       ├── 📄 opengraph-image.tsx
│   │   │       └── 📄 page.tsx
│   │   ├── 📁 search
│   │   │   └── 📄 page.tsx
│   │   ├── 🖼️ favicon.ico
│   │   ├── 🎨 globals.css
│   │   ├── 📄 layout.tsx
│   │   ├── 📄 not-found.tsx
│   │   ├── 📄 opengraph-image.tsx
│   │   └── 📄 page.tsx
│   ├── 📁 assets
│   │   ├── 📁 docs
│   │   │   ├── 📁 Project_Based
│   │   │   │   ├── 📝 PROJECT_STRUCTURE.md
│   │   │   │   ├── 📝 README_ABOUT_PAGES.md
│   │   │   │   ├── 📝 README_API_STRUCTURE.md
│   │   │   │   ├── 📝 README_AUTH_SESSIONS.md
│   │   │   │   ├── 📝 README_CART.md
│   │   │   │   ├── 📝 README_COLLECTIONS.md
│   │   │   │   ├── 📝 README_PRODUCT_STUDIO.md
│   │   │   │   ├── 📝 README_THUMBNAILS.md
│   │   │   │   ├── 📝 README_UI_UX.md
│   │   │   │   └── 📝 README_USER_MANAGER.md
│   │   │   ├── 📝 README_API_DOCUMENTATION.md
│   │   │   ├── 📝 README_PROJECT_HABIT.md
│   │   │   ├── 📝 README_PROPER_IMPORT_INSTRUCTION.md
│   │   │   ├── 📝 README_TYPESAFETY.md
│   │   │   └── 📝 README.md
│   │   ├── 📁 images
│   │   │   ├── 🖼️ avatar_png_v1.png
│   │   │   ├── 🖼️ avatar_ty_png_v1.png
│   │   │   ├── 🖼️ avatar_ty_v1.png
│   │   │   ├── 🖼️ avatar_v1.png
│   │   │   ├── 🖼️ logo_png_v1.png
│   │   │   ├── 🖼️ logo_svg_v1.svg
│   │   │   └── 🖼️ logo_v1.png
│   │   └── 📁 TODO
│   │       └── 📝 README.md
│   ├── 📁 hooks
│   │   └── 📄 Heartbeat.hook.tsx
│   ├── 📁 lib
│   │   ├── 📁 Database
│   │   │   ├── 📁 Dump
│   │   │   │   ├── 📁 Important
│   │   │   │   │   └── 📄 setting_toggle.csv
│   │   │   │   └── 📝 LATEST_SCHEMA.sql
│   │   │   ├── 📁 Index
│   │   │   │   ├── 📄 Indexing.ts
│   │   │   │   └── 📝 README.md
│   │   │   ├── 📁 Migrations
│   │   │   │   ├── 📝 20261125103548610_initial_schema.sql
│   │   │   │   └── 📝 20261126120000000_variant_visibility_and_order_limits.sql
│   │   │   ├── 📄 connection.db.ts
│   │   │   ├── 📄 create.index.db.ts
│   │   │   ├── 📄 init.db.ts
│   │   │   ├── 📄 main.db.ts
│   │   │   ├── 📄 migration.runner.db.ts
│   │   │   ├── 📄 migration.table.db.ts
│   │   │   └── 📝 README.md
│   │   ├── 📁 ImageKit
│   │   │   └── 📄 imagekit.config.ts
│   │   └── 📁 Redis
│   │       ├── 📄 rateLimiter.redis.ts
│   │       └── 📄 redis.config.ts
│   ├── 📁 services
│   │   ├── 📄 AuditLog.service.ts
│   │   ├── 📄 Imagekit.service.ts
│   │   ├── 📄 RedisKey.service.ts
│   │   └── 📄 Setting.service.ts
│   ├── 📁 types
│   │   ├── 📁 AuditLog
│   │   │   └── 📄 auditLog.types.ts
│   │   ├── 📁 Imagekit
│   │   │   └── 📄 Imagekit.types.ts
│   │   ├── 📁 Setting
│   │   │   └── 📄 setting.types.ts
│   │   ├── 📁 User
│   │   │   ├── 📄 JWT.types.ts
│   │   │   ├── 📄 ProfileClient.types.ts
│   │   │   └── 📄 UserRow.types.ts
│   │   ├── 📄 Cart.types.ts
│   │   ├── 📄 Collection.types.ts
│   │   └── 📄 Heartbeat.types.ts
│   ├── 📁 utils
│   │   ├── 📁 AdminRange
│   │   │   ├── 📄 adminRange.types.ts
│   │   │   └── 📄 adminRange.utils.ts
│   │   ├── 📁 Api
│   │   │   └── 📄 apiResponse.util.ts
│   │   ├── 📁 Auth
│   │   │   ├── 📄 Auth.axiosErrorHelper.util.ts
│   │   │   ├── 📄 Auth.isFromIndia.util.ts
│   │   │   ├── 📄 Auth.loginCooldown.util.ts
│   │   │   ├── 📄 Auth.loginGuard.util.ts
│   │   │   ├── 📄 Auth.requireRole.util.ts
│   │   │   └── 📄 AuthErrors.ts
│   │   ├── 📁 Cart
│   │   │   ├── 📄 cart.util.ts
│   │   │   └── 📄 cartNotice.util.ts
│   │   ├── 📁 Formator
│   │   │   ├── 📄 capitalize.util.ts
│   │   │   ├── 📄 formatCurrency.util.ts
│   │   │   ├── 📄 formatDateTime.util.ts
│   │   │   ├── 📄 plural.util.ts
│   │   │   ├── 📄 productIdentity.util.ts
│   │   │   ├── 📄 toNumber.util.ts
│   │   │   └── 📄 toPascalCase.util.ts
│   │   ├── 📁 Heartbeat
│   │   │   ├── 📄 Heartbeat.session.util.ts
│   │   │   └── 📄 Heartbeat.util.ts
│   │   ├── 📁 Imagekit
│   │   │   └── 📄 imagekit.util.ts
│   │   ├── 📁 Pricing
│   │   │   └── 📄 pricing.util.ts
│   │   ├── 📁 ProductStudio
│   │   │   └── 📄 productStudio.lookup.util.ts
│   │   ├── 📁 Slug
│   │   │   └── 📄 slug.util.ts
│   │   ├── 📁 Tags
│   │   │   └── 📄 tag.util.ts
│   │   ├── 📁 ValueFetcher
│   │   │   ├── 📄 getDateTime.util.ts
│   │   │   ├── 📄 getDBName.util.ts
│   │   │   └── 📄 getProduction.util.ts
│   │   ├── 📁 zod
│   │   │   ├── 📁 admin
│   │   │   │   └── 📄 userManager.zod.ts
│   │   │   ├── 📁 cart
│   │   │   │   └── 📄 cart.zod.ts
│   │   │   ├── 📁 product
│   │   │   │   ├── 📄 manager.category.zod.ts
│   │   │   │   ├── 📄 manager.option.zod.ts
│   │   │   │   ├── 📄 manager.product.zod.ts
│   │   │   │   ├── 📄 manager.productDetail.zod.ts
│   │   │   │   └── 📄 manager.tag.zod.ts
│   │   │   ├── 📄 auth.credentialsLogin.schemas.zod.ts
│   │   │   ├── 📄 auth.profile.zod.ts
│   │   │   ├── 📄 auth.setPassword.zod.ts
│   │   │   ├── 📄 auth.valildator.zod.ts
│   │   │   └── 📄 setting.validator.zod.ts
│   │   ├── 📁 zod-schema
│   │   │   └── 📄 imagekit.schemas.zod.ts
│   │   ├── 📄 generateULID.util.ts
│   │   ├── 📄 main.util.ts
│   │   └── 📄 TTL.util.ts
│   └── 📄 proxy.ts
├── 📄 .gitignore
├── 📝 AGENTS.md
├── 📝 CLAUDE.md
├── ⚙️ eslint.config.mjs
├── 📄 next-env.d.ts
├── 📄 next.config.ts
├── ⚙️ package-lock.json
├── ⚙️ package.json
├── ⚙️ postcss.config.mjs
├── 📝 README.md
├── 📄 tsconfig.check.tsbuildinfo
├── ⚙️ tsconfig.json
├── 📄 tsconfig.tsbuildinfo
└── ⚙️ vercel.json
```

---

## Where things live

| What | Path |
| --- | --- |
| Page routes (thin `page.tsx` → one client component) | `src/app/<segment>/page.tsx` |
| Public storefront clients | `src/app/(components)/Pages/` — `Landing`, `Collections`, `CollectionBrowse`, `CollectionProduct`, `CollectionCard`, `CartClient`, `SearchProducts`, `LoginClient` |
| Manager clients | `src/app/(components)/Pages/Manager/` |
| Admin clients | `src/app/(components)/Pages/Admin/` |
| Customer dashboard clients | `src/app/(components)/Pages/Dashboard/` |
| Shared shells / chrome | `src/app/(components)/` — `Footer`, `GoBack`, `CustomLoader`, `MetricChartCard`, `Navbar/`, `About/AboutLayout`, `Policy/PolicyLayout` |
| Reusable UI + hooks | `src/app/(components)/utils/` — `PageWrapper`, `SectionDiv`, `ErrorState`, `ConfirmDialog`, `ContactModal`, `UserAvatar`, `PhotoViewer`, `Form/`, `Hooks/useDebouncedValue`, `SocialIcons`, `WhatsappFloating` |
| APIs | `src/app/api/{public,user,auth,manager,admin}/…/route.ts` |
| Database | `src/lib/Database/` — `main.db.ts` (`getPool`), `connection.db.ts`, `index.db.ts`, `Migrations/*.sql`, `Dump/LATEST_SCHEMA.sql` |
| Server utilities | `src/utils/` — `Auth`, `Api`, `Formator`, `Cart`, `Pricing`, `Slug`, `Tags`, `Imagekit`, `ValueFetcher`, `zod/` |
| Shared types | `src/types/` |
| Docs | `src/assets/docs/` (+ `Project_Based/` for project-specific notes) |

### Rules that apply to everything here

- `LATEST_SCHEMA.sql` is the **current** schema, not a history. A new migration is
  added as `Migrations/<timestamp>_<name>.sql` **and** the dump is edited in
  place so it reads as the post-migration table — the runner applies pending
  files at boot (`runMigrations`), never the dump.
- Every page container is `max-w-7xl` inside `PageWrapper`; the page header nav
  bars (`PolicyLayout`, `AboutLayout`) share one height (`README_UI_UX.md`).
- Selects and inputs take the same `inputClass()` so a row of controls never
  has mismatched heights.
- Reuse before adding: search the concept in `utils/`, `types/`, `zod/` and
  `(components)/utils/` first (`README_PROJECT_HABIT.md`).
