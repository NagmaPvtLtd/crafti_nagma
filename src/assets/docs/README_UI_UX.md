# Things to keep in mind:

- Learn from the landing page
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
- **All admin pages and the collections page must use `PageWrapper`** as their outermost wrapper. This includes:
  - Admin pages: dashboard, audit-logs, settings (already use it)
  - Collections page: both the main `Collections` component and any footer notes should be inside `PageWrapper`
  - Dashboard pages: orders, profile, wishlist (already use it)
- Page routes stay thin: a `page.tsx` that renders one client component; logic lives in the client file or the API.
- Currency formatting: always use `formatCurrency()` from `src/utils/Formator/formatCurrency.util.ts` — never define a local `inr()` helper in individual files. The utility formats INR with `en-IN` locale and 0 decimal places.
