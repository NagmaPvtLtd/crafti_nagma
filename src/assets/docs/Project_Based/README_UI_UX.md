# Things to keep in mind:

- Learn from the landing page
- **Strict page width: `max-w-7xl` — always, on every page.** Never introduce another `max-w-*` for a page container (see the checklist below).
- Learn how the files inside works: src\app\(components)\utils & reuse those in the new pages you are told to create
- Use the CustomLoader (src\app\(components)\CustomLoader.tsx) wherever necessary to avoid making custom Loader
- If graphs are required to be made then use (src\app\(components)\MetricChartCard.tsx)
- Do not add that background blur thing or black thing. Make the background white/80 , just keep the popup as it is and add some shadow over it. thats it,

---

## Rule #0 — the shopper comes first

Before you add **anything** to a screen (a sentence, a heading, a statistic, a badge,
an extra section), stop and ask the user's question:

> *“Is this worth the time the user spends reading it?”*

If the answer is not an obvious yes, do not ship it. A UI is not a report about the
project — it only exists to help the next click.

- **Never explain the page to itself.** Copy like “Featured pieces first, then
  browse by category or search…” is noise; the sections below already say that.
  Keep a page heading human and short (“Our collection”), not a table of contents.
- **Do not surface internal statistics** — `N products`, `N categories`, `N tags`,
  counts, ids, slugs, “3 products · 3 categories”. A number earns its place only
  if it changes what the user does next (e.g. price, stock, delivery time, a
  savings amount).
- **One idea per block.** If a block does not lead to the next action, delete it
  instead of restyling it. Fewer sections with real content beat more sections
  with labels.
- **Show, don't announce.** A product photo, a category card and a price tell the
  story; a paragraph describing them does not.
- **No badge spam.** One meaningful badge per surface. Repeating the same label on
  every chip (e.g. “Inherited” on each tag) is mess — label the group once.
- **Applies to manager screens too.** A manager is a user with a task; show the
  task and its result, not a dashboard of everything the database holds.
- Existing examples to keep as precedent: the `/collections` header kept a single
  heading and dropped its stat pills; the product page shows the discount in the
  price block only, never stamped on the photo.

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
  placed directly inside `PageWrapper`. Inside it: page heading block (`SectionEyebrow` → `h1` → description *only when it adds something*, see Rule #0), then `<SectionDivider className="my-6" size={11} />`, then the page content.
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
- **Page-header nav bars share one height.** The pill row above a page (`PolicyLayout`, `AboutLayout`) is `px-5 py-3.5` on the bar and `text-sm leading-5` with **no vertical padding** on each link; that is what keeps `/policy/*` and `/about`, `/how-it-is-made`, `/care-guide` identical. Do not add `py-*` to the links of one bar and not the other.
- **Public pages speak shopper, never staff.** Words like `studio`, `manager`, `admin`, `database` never appear on `/`, `/collections`, `/search`, `/cart` or the About pages; an empty section hides itself or explains itself in the shopper's terms.

---

## Search bars & debouncing

Every search bar in the project uses **one** utility — never re-implement a timer per page:

- **Hook:** `useDebouncedValue` in `src\app\(components)\utils\Hooks\useDebouncedValue.ts`
- **Delay:** `SEARCH_DEBOUNCE_MS = 1500`. The search runs after 1.5 s without a keystroke; every keystroke clears the pending timer and starts a new one (the timer lives in a `useRef`, and is cleared on unmount).
- **Usage:** `const debounced = useDebouncedValue(input)` then a `useEffect` on `debounced` that either fetches or pushes the URL. Keep the `setState` calls inside an inner function in that effect, per the `react-hooks/set-state-in-effect` note above.
- **URL-driven bars** (`/collections`, `/search`, navbar search) push `/search?q=…` once the pause settles, so Enter is optional; **state-driven bars** (manager lists, admin tools) set their committed query state after the pause.
- **Bars already wired:** `/collections`, `/search`, navbar (desktop + mobile), manager products list (`ProductListClient`), manager global tags (`GlobalTagsClient`), admin audit log (`AuditLogClient`), admin settings.
- **End of every search field:** a bare `CornerDownLeft` (Enter) icon button at `right-2` — no background, no border, `text-stone-400 hover:text-rose-600`. Never a black “Search” pill. Clicking it (or pressing Enter) searches immediately, without waiting for the debounce.
- If a search bar is added somewhere new, use the same hook, the same icon and the same 1.5 s delay — do not copy a `setTimeout` block from another file.

---

## Scrollbar

Scrollbars are visible again (they used to be hidden). The styling lives once, globally, in `src/app/globals.css`:

- **Track:** white (`#ffffff`).
- **Thumb:** pink (`#fb7185`, i.e. rose-400) with rounded ends and a white border so it reads as a floating pill; it deepens to rose-500 (`#f43f5e`) on hover.
- **Size:** thin — 10px on Chromium/WebKit (`::-webkit-scrollbar`) and `scrollbar-width: thin` in Firefox.

Both implementations are declared so the same white track + pink thumb shows in Chromium, Safari and Firefox. Do not re-hide the scrollbar and do not restyle it per page — use the global rules above, and keep the pink in step with the rest of the UI (rose-400 thumb, rose-500 hover).
