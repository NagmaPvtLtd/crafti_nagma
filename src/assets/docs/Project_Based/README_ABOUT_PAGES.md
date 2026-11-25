# About pages — Our story, How it is made, Care guide

Three static, frontend-only pages that the footer's **About** column points at.
No API, no data fetching, no auth — every word is authored copy, so the pages are
Server Components that only render.

Related files:

| Layer | File |
| --- | --- |
| Shared shell + card | `src/app/(components)/About/AboutLayout.tsx` |
| Our story | `src/app/about/page.tsx` |
| How it is made | `src/app/how-it-is-made/page.tsx` |
| Care guide | `src/app/care-guide/page.tsx` |
| Footer links | `src/app/(components)/Footer.tsx` (`FOOTER_CONTENT.columns` → "About") |

---

## 1. Routes

| Route | Page | Reads from |
| --- | --- | --- |
| `/about` | story, stats strip, values, what we make, personal note | `about/page.tsx` |
| `/how-it-is-made` | five numbered craft steps, materials, why 1–2 weeks | `how-it-is-made/page.tsx` |
| `/care-guide` | four quick rules, per-material care lists, repair contact | `care-guide/page.tsx` |

Each `page.tsx` exports its own `metadata` (title + description) and renders
`AboutLayout` with content as children. Anything that needs a browser feature
would go in the client layout, not in the pages — the pages stay server-side.

## 2. `AboutLayout`

```tsx
<AboutLayout eyebrow="Care guide" title="…" lead="…">
  …sections…
</AboutLayout>
```

- `PageWrapper variant="content" position="fixed"` + three soft rose blobs, the
  same rhythm as the policy pages.
- A top nav pill row links the three pages (`Our story`, `How it is made`,
  `Care guide`) and underlines the active one with `usePathname`.
- `SectionEyebrow` → `h1` → lead paragraph → `SectionDivider size={11}`, then the
  children inside a `space-y-6` stack.
- The page container is `mx-auto w-full max-w-7xl px-4 pt-6 pb-12 sm:px-6
  sm:pt-10 sm:pb-16`, per `README_UI_UX.md`.

Two shared exports keep the pages free of duplicated chrome:

- `AboutCard({ icon, title, children })` — the rounded `border-white/60
  bg-white/85 backdrop-blur-sm` card with an icon chip and heading.
- `AboutFooterLinks({ primary, secondary })` — the closing two-link strip that
  walks the reader to the next page in the set.

### Icons cross the boundary as names

`AboutLayout.tsx` is a **Client Component** (`"use client"`), so a Server
Component page cannot hand it a lucide component — React throws *"Functions
cannot be passed directly to Client Components"*. `AboutCard` therefore takes an
icon **name** (`AboutIcon`: `droplets | heart | message | package | scissors |
shirt | sparkles | spool | star | sun | wind`) and resolves it from an internal
`CARD_ICONS` map. To use a new icon, add it to that map and to the union rather
than passing the component down.

Icons rendered *inside* a page (the quick-rule grid in the care guide, the step
list in how-it-is-made) stay as components, because they never leave the server
tree.

## 3. Copy rules

- Crafti Nagma is run by **one person**. Copy never implies a team, staff,
  colleagues or a group of makers: use "one pair of hands", "made by hand", "a
  personal note" — not "our team", "a handful of people", "small team".
- Write for a shopper: no internal words (`studio`, `manager`, `admin`,
  `database`) and no statistics that do not change what they do next.
- Wording stays warm but concrete: real materials, real timings, real care
  steps. No promises the workshop cannot keep.
- No emoji anywhere — lucide icons only (`README_PROJECT_HABIT.md`).
- Apostrophes inside JSX text are written as `&apos;` / avoided; long dashes are
  the em dash (`—`) as in the rest of the storefront.

## 4. Adding a fourth page

1. Add the route folder under `src/app/<slug>/page.tsx` with its `metadata`.
2. Add `{ label, href: "/<slug>" }` to `ABOUT_NAV` in `AboutLayout.tsx` — the
   nav height is fixed by the bar's `py-3.5` plus a `text-sm leading-5` label
   with **no vertical padding on the links**, which is what keeps it the same
   height as `PolicyLayout`'s bar. Keep that rule.
3. Link it from the footer's About column (`Footer.tsx`).
4. Reuse `AboutCard` / `AboutFooterLinks` instead of new card markup.
