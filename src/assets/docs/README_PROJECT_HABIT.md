# Reuse check — mandatory before writing any code

Writing a second copy of something that already exists is a bug, not a shortcut. Before creating any file, component, helper, type, constant or route, run this check and **state the result before you start coding**.

1. **Search by concept, not just by name.** Use `code_search` / `glob` for the behaviour as well as the noun (`isAxiosError`, `error.*message`, `formatCurrency`, `emptyCart`, `quantity`, `PageWrapper`). One search is never enough — try the nouns the feature uses, the verb it performs, and the folder it would live in.
2. **Check every canonical home** before concluding "nothing exists":
   - `src/utils/*` — `Api` (`invalidInput`, `isDuplicateEntry`), `Auth` (`requireRole`, `requireAuth`, `getApiErrorMessage`, `AuthErrors`), `Formator` (`formatCurrency`, `toNumber`, dates), `ValueFetcher` (`getCurrentDateTime`), `Pricing`, `Slug`, `Tags`, `AdminRange`, `Cart`, `ProductStudio`.
   - `src/types/*` and `src/utils/zod/*` — response shapes, DB row types, schemas and their inferred input types.
   - `src/app/(components)/utils/*` — `PageWrapper`, `ErrorState`, `CustomLoader`, `SectionDivider`/`SectionEyebrow`, `ConfirmDialog`, `TagInput`, `PhotoViewer`, `Field`/`TextInput`/`PasswordInput`, `formErrors`, hooks.
   - `src/lib/*` — `getPool`, Redis, ImageKit.
   - the sibling route/component for the same feature, and that feature's README in `src/assets/docs`.
3. **Known traps — these already exist; never rewrite them:**
   - Axios error text → default export `getApiErrorMessage(err, fallback)` from `src/utils/Auth/Auth.axiosErrorHelper.util.ts`. Do **not** add a local `errorMessage` / `getErrorMessage` or an inline `err.response?.data?.error` extraction.
   - Validation 400 → `invalidInput(...)`; duplicate key → `isDuplicateEntry(...)`; both in `src/utils/Api/apiResponse.util.ts`.
   - Money → `formatCurrency`; numeric DB strings → `toNumber`; timestamps → `getCurrentDateTime`; ids → `generateULID("<prefix>")`.
   - Auth → `requireAuth` / `requireRole` wrappers, never a hand-rolled `getServerSession` check inside a route.
   - Page shell, loading, error and section headers → `PageWrapper`, `CustomLoader`, `ErrorState`, `SectionDivider`, `SectionEyebrow`.
4. **Two copies is a defect.** The moment a shape, response builder, row type, constant or helper is needed in a second file, move it to its shared home and import it from both — never paste it. Route files and components keep only what is used once.
5. **Record the check in your reply:** name the files you found and reused, or say plainly that nothing existed and why a new helper is justified. If you cannot name where you looked, you have not done the check.

---

- Always try to understand how the files in components and utils folder contribute and how services works.
- This will allow you to always check the project instead of repeating a simple function which you think you need but that function may already be in the function but just so you can't find it in time or bother finding it you recreate it.
- So always approach in a way so it covers this to some obvious extend to make scalable and reusable and readable code because writing same function everywhere again and again is just lazy.

# Images and links — always use the Next.js components

- Use `<Image />` from `next/image` everywhere instead of a plain HTML `<img>` — cards, galleries, thumbnails, admin media lists, modals, all of them.
- Use `<Link />` from `next/link` for internal navigation instead of a plain `<a href="...">`; reserve `<a>` for external links (`target="_blank"`, WhatsApp, anything leaving the app).
- The allowed remote hosts live in `next.config.ts` → `images.remotePatterns` (`lh3.googleusercontent.com`, `ik.imagekit.io/nagmapvtltd/**`). A new image host must be added there first, never worked around with a plain `<img>`.
- When the image fills a known box, give the wrapper `relative` and use `<Image fill sizes="…" className="object-cover" />`. When the image has its own dimensions, pass `width` and `height`.
- Do not add `@next/next/no-img-element` eslint-disable comments; convert the element to `<Image />` instead.

# Icons — never use a normal emoji

- **Never** put a normal emoji anywhere: UI copy, buttons, toasts, badges, status icons, labels, comments, commit messages, docs. Not as decoration, not as a shorthand.
- Every icon comes from `lucide-react`, sized and coloured with Tailwind classes like the rest of the app (`<Clock className="h-3.5 w-3.5" />`).
- Pick the icon that carries the meaning (e.g. `Clock` for pending, `Truck` for shipped, `CheckCircle2` for completed, `XCircle` for cancelled, `Heart` for wishlist). If no lucide icon fits, use plain text — never an emoji or a hand-rolled inline SVG.

# Server → Client boundary — never pass a function or component

- A Server Component may only hand **plain data** to a `"use client"` component: strings, numbers, booleans, dates that serialise, plain objects and arrays. Passing a lucide icon, a render callback or any other function throws at runtime (`Functions cannot be passed directly to Client Components`) — and `tsc`/`eslint` will not catch it.
- So shared client components take data, not behaviour: an icon **name** (`"heart"`, `"package"`) that the client file resolves from its own map, or a `children` node, instead of an `icon={Heart}` prop.
- Icons rendered inside a Server Component are fine as components; the mistake is only when the value has to cross into a Client Component.
- Symptom to recognise: the page returns `200`, then the browser console shows *"Only plain objects can be passed to Client Components from Server Components"* or the function error above. Fix the prop, not the page.

# Remembered UI state — `sessionStorage`, read on open

- Small bits of convenience state that should survive a reload live in
  `sessionStorage` under a namespaced key (`crafti:<area>:<thing>`, e.g.
  `crafti:pricing-quiz:labour`). Existing examples: the pricing quiz's salary /
  hours / days, `WhatsappFloating`'s dismissal, `Heartbeat.hook`'s session flag.
- **Never read storage in a `useState` initialiser.** The component is
  server-rendered too, so the server (no storage) and the first client render
  would disagree. Initialise with the real default, then read storage in the
  handler that opens the surface (or in an event), and write on every change.
- Parsing and writing are wrapped in `try/catch`: blocked storage (private mode)
  and corrupt JSON fall back to the defaults field by field, and a failed write
  never breaks the UI.
- Anything that must outlive the tab (preferences, draft orders) belongs in the
  database behind an API, not here.

# Verification — the owner does the manual testing

- Do **not** start `next dev` (or any preview server), do **not** curl API endpoints or pages, and do **not** click through the app to test a change. That manual verification — sign-in flows, hitting APIs, dev-server smoke tests — is the owner's own work; they will do it themselves.
- Do not write throwaway scripts, temporary probes or extra test harnesses just to exercise endpoints.
- For a normal change, the only checks to run are the static ones: `npx tsc --noEmit`, `npx eslint` on the touched files, and `npx next typegen` when routes/pages changed.
- Report anything runtime-related that was not exercised as **manually untested** — do not test it yourself and do not claim it works.
- If a failure can only be reproduced with a running server, stop at the static error and hand it over.
