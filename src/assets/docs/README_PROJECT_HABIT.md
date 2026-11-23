- Always try to understand how the files in components and utils folder contribute and how services works.
- This will allow you to always check the project instead of repeating a simple function which you think you need but that function may already be in the function but just so you can't find it in time or bother finding it you recreate it.
- So always approach in a way so it covers this to some obvious extend to make scalable and reusable and readable code because writing same function everywhere again and again is just lazy.

# Images and links — always use the Next.js components

- Use `<Image />` from `next/image` everywhere instead of a plain HTML `<img>` — cards, galleries, thumbnails, admin media lists, modals, all of them.
- Use `<Link />` from `next/link` for internal navigation instead of a plain `<a href="...">`; reserve `<a>` for external links (`target="_blank"`, WhatsApp, anything leaving the app).
- The allowed remote hosts live in `next.config.ts` → `images.remotePatterns` (`lh3.googleusercontent.com`, `ik.imagekit.io/nagmapvtltd/**`). A new image host must be added there first, never worked around with a plain `<img>`.
- When the image fills a known box, give the wrapper `relative` and use `<Image fill sizes="…" className="object-cover" />`. When the image has its own dimensions, pass `width` and `height`.
- Do not add `@next/next/no-img-element` eslint-disable comments; convert the element to `<Image />` instead.

# Verification — the owner does the manual testing

- Do **not** start `next dev` (or any preview server), do **not** curl API endpoints or pages, and do **not** click through the app to test a change. That manual verification — sign-in flows, hitting APIs, dev-server smoke tests — is the owner's own work; they will do it themselves.
- Do not write throwaway scripts, temporary probes or extra test harnesses just to exercise endpoints.
- For a normal change, the only checks to run are the static ones: `npx tsc --noEmit`, `npx eslint` on the touched files, and `npx next typegen` when routes/pages changed.
- Report anything runtime-related that was not exercised as **manually untested** — do not test it yourself and do not claim it works.
- If a failure can only be reproduced with a running server, stop at the static error and hand it over.
