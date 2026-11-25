# File Tree: crafti_nagma

```
├── 📁 .freebuff
│   ├── ⚙️ .gitignore
│   └── 📄 project-id
├── 📁 public
│   ├── 📁 assets
│   │   ├── 🖼️ avatar_v1.png
│   │   ├── 🖼️ bg_white.jpg
│   │   └── 🖼️ logo_v1.png
│   ├── 📝 Flow.md
│   ├── 📘 admin_product_management_flow.docx
│   ├── 📝 dynamic-product.md
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
│   │   │   │   │   └── 📄 DashboardClient.tsx
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
│   │   │   │   │   ├── 📄 PasswordInput.tsx
│   │   │   │   │   ├── 📄 TextInput.tsx
│   │   │   │   │   ├── 📄 Textarea.tsx
│   │   │   │   │   ├── 📄 fieldStyles.ts
│   │   │   │   │   └── 📄 formErrors.ts
│   │   │   │   ├── 📁 Hooks
│   │   │   │   │   └── 📄 useDebouncedValue.ts
│   │   │   │   ├── 📄 ConfirmDialog.tsx
│   │   │   │   ├── 📄 ErrorState.tsx
│   │   │   │   ├── 📄 PageWrapper.tsx
│   │   │   │   ├── 📄 PhotoViewer.tsx
│   │   │   │   ├── 📄 ScrollToTop.tsx
│   │   │   │   ├── 📄 SectionDiv.tsx
│   │   │   │   ├── 📄 SocialIcons.tsx
│   │   │   │   ├── 📄 TagInput.tsx
│   │   │   │   ├── 📄 TrendChart.tsx
│   │   │   │   ├── 📄 WhatsappFloating.tsx
│   │   │   │   └── 📄 ogImage.tsx
│   │   │   ├── 📄 CustomLoader.tsx
│   │   │   ├── 📄 Footer.tsx
│   │   │   ├── 📄 GoBack.tsx
│   │   │   └── 📄 MetricChartCard.tsx
│   │   ├── 📁 admin
│   │   │   ├── 📁 audit-logs
│   │   │   │   └── 📄 page.tsx
│   │   │   ├── 📁 dashboard
│   │   │   │   └── 📄 page.tsx
│   │   │   ├── 📁 settings
│   │   │   │   └── 📄 page.tsx
│   │   │   └── 📄 page.tsx
│   │   ├── 📁 api
│   │   │   ├── 📁 admin
│   │   │   │   ├── 📁 audit-logs
│   │   │   │   │   └── 📄 route.ts
│   │   │   │   ├── 📁 dashboard
│   │   │   │   │   └── 📄 route.ts
│   │   │   │   └── 📁 settings
│   │   │   │       ├── 📁 [fieldName]
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
│   │   ├── 📁 about
│   │   │   └── 📄 page.tsx
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
│   │   ├── 📄 favicon.ico
│   │   ├── 🎨 globals.css
│   │   ├── 📄 layout.tsx
│   │   ├── 📄 not-found.tsx
│   │   ├── 📄 opengraph-image.tsx
│   │   └── 📄 page.tsx
│   ├── 📁 assets
│   │   ├── 📁 TODO
│   │   │   └── 📝 README.md
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
│   │   │   ├── 📝 README.md
│   │   │   ├── 📝 README_API_DOCUMENTATION.md
│   │   │   ├── 📝 README_PROJECT_HABIT.md
│   │   │   ├── 📝 README_PROPER_IMPORT_INSTRUCTION.md
│   │   │   └── 📝 README_TYPESAFETY.md
│   │   └── 📁 images
│   │       ├── 🖼️ avatar_png_v1.png
│   │       ├── 🖼️ avatar_ty_png_v1.png
│   │       ├── 🖼️ avatar_ty_v1.png
│   │       ├── 🖼️ avatar_v1.png
│   │       ├── 🖼️ logo_png_v1.png
│   │       ├── 🖼️ logo_svg_v1.svg
│   │       └── 🖼️ logo_v1.png
│   ├── 📁 hooks
│   │   └── 📄 Heartbeat.hook.tsx
│   ├── 📁 lib
│   │   ├── 📁 Database
│   │   │   ├── 📁 Dump
│   │   │   │   ├── 📁 Important
│   │   │   │   │   └── 📄 setting_toggle.csv
│   │   │   │   └── 📄 LATEST_SCHEMA.sql
│   │   │   ├── 📁 Index
│   │   │   │   ├── 📄 Indexing.ts
│   │   │   │   └── 📝 README.md
│   │   │   ├── 📁 Migrations
│   │   │   │   ├── 📄 20261107161717980_initial_schema.sql
│   │   │   │   ├── 📄 20261118175244390_imagekit_files_entity.sql
│   │   │   │   ├── 📄 20261118175253093_product_media_reviews.sql
│   │   │   │   ├── 📄 20261119191754844_product_variant_image_links.sql
│   │   │   │   ├── 📄 20261123061227512_variant_dimensions_features_care.sql
│   │   │   │   └── 📄 20261123082957485_product_tags.sql
│   │   │   ├── 📝 README.md
│   │   │   ├── 📄 connection.db.ts
│   │   │   ├── 📄 create.index.db.ts
│   │   │   ├── 📄 init.db.ts
│   │   │   ├── 📄 main.db.ts
│   │   │   ├── 📄 migration.runner.db.ts
│   │   │   └── 📄 migration.table.db.ts
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
│   │   │   ├── 📄 Auth.requireRole.util.ts
│   │   │   └── 📄 AuthErrors.ts
│   │   ├── 📁 Cart
│   │   │   └── 📄 cart.util.ts
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
│   │   │   ├── 📄 getDBName.util.ts
│   │   │   ├── 📄 getDateTime.util.ts
│   │   │   └── 📄 getProduction.util.ts
│   │   ├── 📁 zod
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
│   │   ├── 📄 TTL.util.ts
│   │   ├── 📄 generateULID.util.ts
│   │   └── 📄 main.util.ts
│   └── 📄 proxy.ts
├── ⚙️ .env.prince
├── ⚙️ .gitignore
├── 📝 AGENTS.md
├── 📝 CLAUDE.md
├── 📝 README.md
├── 📄 eslint.config.mjs
├── 📄 next.config.ts
├── ⚙️ package-lock.json
├── ⚙️ package.json
├── 📄 postcss.config.mjs
├── ⚙️ tsconfig.json
└── ⚙️ vercel.json
```

---

_Generated by FileTree Pro Extension_
