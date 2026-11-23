# Things to keep in mind:

- Learn from the landing page
- **Strict page width: `max-w-7xl` — always, on every page.** Never introduce another `max-w-*` for a page container (see the checklist below).
- Learn how the files inside works: src\app\(components)\utils & reuse those in the new pages you are told to create
- Use the CustomLoader (src\app\(components)\CustomLoader.tsx) wherever necessary to avoid making custom Loader
- If graphs are required to be made then use (src\app\(components)\MetricChartCard.tsx)
- Do not add that background blur thing or black thing. Make the background white/80 , just keep the popup as it is and add some shadow over it. thats it,

---

## Checklist (point-wise)

- Form controls: `Field` + `TextInput` from `src\app\(components)\utils\Form` with `inputClass()` — do not invent new input styling.
- Errors: `getAxiosErrorMessage(err, "fallback")` (`src\utils\Auth\Auth.axiosErrorHelper.util.ts`); success and transient failures go through `react-hot-toast` (the `Toaster` is already mounted in the root layout).
- Each data page keeps four states: loading (`CustomLoader`), error (inline banner + Retry), empty (a CTA that teaches by example), loaded.
- `CustomLoader` with `fullScreen={false}` for in-page loads; no bespoke skeletons or spinners.
- Data fetching: keep the request in a `useCallback` and set state in `.then/.catch/.finally` with an `active` flag — calling `setState` synchronously in an effect body trips `react-hooks/set-state-in-effect`.
- Page shell: `PageWrapper` + `SectionDivider` / `SectionEyebrow` + `mx-auto max-w-7xl px-4 sm:px-6`, same rhythm as the landing page.
- **STRICT RULE — every page container is `max-w-7xl`. No exceptions.** The outermost content div of any page is always:
  `mx-auto w-full max-w-7xl px-4 pt-6 pb-12 sm:px-6 sm:pt-10 sm:pb-16`
  placed directly inside `PageWrapper`. Inside it: page heading block (`SectionEyebrow` → `h1` → description), then `<SectionDivider className="my-6" size={11} />`, then the page content.
  - Never use `max-w-5xl`, `max-w-6xl`, `max-w-3xl` or any other width for a page container, and never split a page into multiple `max-w-*` containers — one container encloses the whole page.
  - Narrow widths (`max-w-md`, `max-w-xl`, `max-w-2xl`, …) are only allowed *inside* the page for content blocks: cards, forms, modals, descriptions, empty states.
  - Reference implementations to copy: `src\app\admin\settings\page.tsx` and `src\app\(components)\Pages\Dashboard\ProfileClient.tsx`.
  - The eyebrow is replaced by a `Go back to …` link only when the page is a detail/sub page that needs one; otherwise it stays as the pink `SectionEyebrow`.
- **All pages must use `PageWrapper`** as their outermost wrapper, with the single `max-w-7xl` container described above. This includes:
  - Admin pages: dashboard, audit-logs, settings (already use it)
  - Collections page: both the main `Collections` component and any footer notes should be inside `PageWrapper`
  - Dashboard pages: orders, profile, wishlist (already use it)
- Page routes stay thin: a `page.tsx` that renders one client component; logic lives in the client file or the API.
- Currency formatting: always use `formatCurrency()` from `src/utils/Formator/formatCurrency.util.ts` — never define a local `inr()` helper in individual files. The utility formats INR with `en-IN` locale and 0 decimal places.

---

## Scrollbar

Scrollbars are visible again (they used to be hidden). The styling lives once, globally, in `src/app/globals.css`:

- **Track:** white (`#ffffff`).
- **Thumb:** pink (`#fb7185`, i.e. rose-400) with rounded ends and a white border so it reads as a floating pill; it deepens to rose-500 (`#f43f5e`) on hover.
- **Size:** thin — 10px on Chromium/WebKit (`::-webkit-scrollbar`) and `scrollbar-width: thin` in Firefox.

Both implementations are declared so the same white track + pink thumb shows in Chromium, Safari and Firefox. Do not re-hide the scrollbar and do not restyle it per page — use the global rules above, and keep the pink in step with the rest of the UI (rose-400 thumb, rose-500 hover).
