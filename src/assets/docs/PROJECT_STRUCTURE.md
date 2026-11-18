# File Tree: crafti_nagma

**Generated:** 11/18/2026, 11:56:28 PM
**Root Path:** `c:\Users\itsmeprince\Documents\GitHub\crafti_nagma`

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
│   │   │   ├── 📁 Navbar
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
│   │   │   │   │   ├── 📄 GlobalCategoriesClient.tsx
│   │   │   │   │   ├── 📄 GlobalOptionsClient.tsx
│   │   │   │   │   ├── 📄 PricingQuizModal.tsx
│   │   │   │   │   ├── 📄 ProductDetailClient.tsx
│   │   │   │   │   ├── 📄 ProductListClient.tsx
│   │   │   │   │   ├── 📄 ProductManagerClient.tsx
│   │   │   │   │   ├── 📄 ProductMediaManager.tsx
│   │   │   │   │   ├── 📄 StudioModal.tsx
│   │   │   │   │   └── 📄 VariantDetailClient.tsx
│   │   │   │   ├── 📄 Collections.tsx
│   │   │   │   ├── 📄 Landing.tsx
│   │   │   │   └── 📄 LoginClient.tsx
│   │   │   ├── 📁 Policy
│   │   │   │   └── 📄 PolicyLayout.tsx
│   │   │   ├── 📁 Providers
│   │   │   │   └── 📄 Imagekit.Provider.tsx
│   │   │   ├── 📁 utils
│   │   │   │   ├── 📁 Form
│   │   │   │   │   ├── 📄 Field.tsx
│   │   │   │   │   ├── 📄 PasswordInput.tsx
│   │   │   │   │   ├── 📄 TextInput.tsx
│   │   │   │   │   ├── 📄 Textarea.tsx
│   │   │   │   │   └── 📄 fieldStyles.ts
│   │   │   │   ├── 📄 PageWrapper.tsx
│   │   │   │   ├── 📄 ScrollToTop.tsx
│   │   │   │   ├── 📄 SectionDiv.tsx
│   │   │   │   ├── 📄 SocialIcons.tsx
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
│   │   │   │       └── 📄 route.ts
│   │   │   ├── 📁 public
│   │   │   │   └── 📁 heartbeat
│   │   │   │       └── 📄 route.ts
│   │   │   └── 📁 user
│   │   ├── 📁 collections
│   │   │   └── 📄 page.tsx
│   │   ├── 📁 dashboard
│   │   │   ├── 📁 orders
│   │   │   │   └── 📄 page.tsx
│   │   │   ├── 📁 profile
│   │   │   │   └── 📄 page.tsx
│   │   │   ├── 📁 wishlist
│   │   │   │   └── 📄 page.tsx
│   │   │   └── 📄 page.tsx
│   │   ├── 📁 login
│   │   │   ├── 📄 opengraph-image.tsx
│   │   │   └── 📄 page.tsx
│   │   ├── 📁 manager
│   │   │   └── 📁 product-studio
│   │   │       ├── 📁 categories
│   │   │       │   └── 📄 page.tsx
│   │   │       ├── 📁 options
│   │   │       │   └── 📄 page.tsx
│   │   │       ├── 📁 products
│   │   │       │   ├── 📁 [product_id]
│   │   │       │   │   ├── 📁 variants
│   │   │       │   │   │   └── 📁 [variant_id]
│   │   │       │   │   │       └── 📄 page.tsx
│   │   │       │   │   └── 📄 page.tsx
│   │   │       │   ├── 📁 new
│   │   │       │   │   └── 📄 page.tsx
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
│   │   ├── 📄 favicon.ico
│   │   ├── 🎨 globals.css
│   │   ├── 📄 layout.tsx
│   │   ├── 📄 not-found.tsx
│   │   ├── 📄 opengraph-image.tsx
│   │   └── 📄 page.tsx
│   ├── 📁 assets
│   │   ├── 📁 docs
│   │   │   ├── 📝 README.md
│   │   │   ├── 📝 README_API_STRUCTURE.md
│   │   │   ├── 📝 README_PRODUCT_STUDIO.md
│   │   │   ├── 📝 README_TYPESAFETY.md
│   │   │   └── 📝 README_UI_UX.md
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
│   │   │   │   └── 📄 20261118175253093_product_media_reviews.sql
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
│   │   └── 📄 Heartbeat.types.ts
│   ├── 📁 utils
│   │   ├── 📁 AdminRange
│   │   │   ├── 📄 adminRange.types.ts
│   │   │   └── 📄 adminRange.utils.ts
│   │   ├── 📁 Auth
│   │   │   ├── 📄 Auth.axiosErrorHelper.util.ts
│   │   │   ├── 📄 Auth.isFromIndia.util.ts
│   │   │   ├── 📄 Auth.requireRole.util.ts
│   │   │   └── 📄 AuthErrors.ts
│   │   ├── 📁 Formator
│   │   │   └── 📄 formatDateTime.util.ts
│   │   ├── 📁 Heartbeat
│   │   │   ├── 📄 Heartbeat.session.util.ts
│   │   │   └── 📄 Heartbeat.util.ts
│   │   ├── 📁 Imagekit
│   │   │   └── 📄 imagekit.util.ts
│   │   ├── 📁 Pricing
│   │   │   └── 📄 pricing.util.ts
│   │   ├── 📁 Slug
│   │   │   └── 📄 slug.util.ts
│   │   ├── 📁 ValueFetcher
│   │   │   ├── 📄 getDBName.util.ts
│   │   │   ├── 📄 getDateTime.util.ts
│   │   │   └── 📄 getProduction.util.ts
│   │   ├── 📁 zod
│   │   │   ├── 📁 product
│   │   │   │   ├── 📄 manager.category.zod.ts
│   │   │   │   ├── 📄 manager.option.zod.ts
│   │   │   │   ├── 📄 manager.product.zod.ts
│   │   │   │   └── 📄 manager.productDetail.zod.ts
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
