# API JSDoc Documentation Instructions

> **Purpose:** This file is the standard for documenting API route handlers in this
> repository. Give this file to an AI (or a developer) together with a route file and
> the instruction _"read these instructions and write the API documentation for this
> route"_ — the result must look like the JSDoc block in
> `src/app/api/admin/manual-booking/create/route.ts`.

---

## 0. Scope

- Apply to every exported handler in `src/app/api/**/route.ts`
  (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).
- Also apply a (shorter) block to non-exported helpers, normalizers and constants in
  the same file (see §8).
- Only document what the code actually does. Never invent fields, defaults, limits,
  tables, permissions or side effects. If something is unclear, read the imported
  util/service instead of guessing.

---

## 1. Placement & wrapper

- The block is a `/** ... */` comment placed **immediately above the exported
  handler**, after the imports (and after any file-level
  `/* eslint-disable ... */` line).
- Every exported handler in the file gets **its own** block. Multi-method files repeat
  the block per method.
- Inside the block every line starts with `*`. Tag lines use
  ` * @tag`. Nested/continued content is indented with three extra spaces:
  ` *   - ...` (numbered workflow steps, response fields, throw causes).
- Keep lines readable (~100 chars). Do **not** use markdown headings, tables, or
  `#` inside the block.
- Use backticks for identifiers, column names, env vars, header names, SQL keywords
  and literal values (`admin_action`, `manual_bookings`, `NULL`). Use double quotes for
  user-facing strings taken from the code.

---

## 2. Tag order (strict)

The block must follow this exact order. Omit a section only when it does not apply
(e.g. no request body for a `GET`).

```ts
/**
 * <One-line summary of what the endpoint does (sentence case, no "This endpoint").>
 *
 * @async
 * @function <HTTP_METHOD>
 * @description <2–5 sentence paragraph: what it creates/reads/updates/deletes, which
 *              validations it performs, which calculations it applies, which PDFs /
 *              mails / caches / transactions are involved.>
 *
 * @param {Request} req - The incoming HTTP request<, "with multipart form data" /
 *                        "with a JSON body" when relevant>
 * @param {Object} context - Next.js route context
 * @param {Promise<{ <param>: string }>} context.params - Route parameters (`(await context.params).<param>`)
 *
 * @body {string} field - Meaning and rules (required)
 * @body {string} [optionalField] - Meaning (optional, default: "<value from code>")
 * ... one line per field, in the order they are destructured/read ...
 *
 * @query {string} [search] - Meaning (optional)
 * @query {number} [page] - Page number (default: 1)
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - <key>: <what it holds>
 *   - <key>: <what it holds>
 *
 * @throws {400} <Human description of the cause>
 * @throws {401} Unauthorized - <cause>
 * @throws {403} <cause>
 * @throws {404} <cause>
 * @throws {409} <cause>
 * @throws {500} <cause>
 *
 * @description Workflow:
 *   1. Initialize server and database connection
 *   2. ...
 *   N. Return <status> response with <payload>
 */
export async function POST(...) { ... }
```

---

## 3. The header lines

| Line                   | Rule                                                                                                                                                                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Summary                | One sentence, ≤ 100 chars, ends with a period. Says what the endpoint _does_ (create, fetch, update, delete, approve, reset…), naming the main resource.                                                                                           |
| `@async`               | Present on every async handler.                                                                                                                                                                                                                    |
| `@function`            | The HTTP method name exactly as exported (`POST`, `GET`, `PATCH`…).                                                                                                                                                                                |
| `@description` (first) | 2–5 sentences of substance: resource touched, key validations, business calculations (GST/TDS/commission/percentages), transactional behaviour, generated artefacts (PDFs, invoice IDs), jobs/mails queued, caches cleared. No marketing language. |
| `@param`               | `req` always; `context` only when the route has dynamic segments, plus the destructured params line using `Promise<{ name: string }>`.                                                                                                             |

---

## 4. Request field documentation

- **JSON routes:** use `@body {type} field - ...`.
- **Multipart routes:** use `@formdata {type} field - ...` (types: `string`, `File`,
  `File[]`, `boolean-as-string`).
- **Query-string routes:** use `@query {type} field - ...`; for repeated/variant names
  prefer the dominant convention in the file being documented.
- One line per field, listed in the order the handler reads/destructures them
  (text fields first, files after, then "existing/new value" URL fields).
- Mark optional fields with square brackets and say what happens when omitted:
  `@formdata {string} [cityCode] - Short code for agreement ID generation (max 5 chars, auto-derived for Kanpur/Noida if omitted)`.
- Document the **literal validation rules** enforced by the code, including the
  numbers: exact digit counts, min/max lengths, allowed enums, decimals, date ranges,
  file-size caps, fallbacks to global settings. Example:
  `@formdata {string} endDateTime - Rental end date and time (must be after start, max 30 days, min 1 hour)`.
- For files, always include the size cap and whether a URL fallback field exists
  (e.g. `(max 20MB)` / `@formdata {string} [existingOwnerSignatureUrl] - Used if no new file uploaded`).
- Never list fields the handler does not read. Never describe a field's rule you did
  not find in code.

---

## 5. `@returns` and `@throws`

- `@returns {Promise<NextResponse>} JSON response with:` followed by a `- key: ...`
  line for every top-level key the success path returns (including `warning`,
  `data`, `pagination`, `success`).
- List only real status codes and their real causes, in ascending order. Format:
  `@throws {401} Unauthorized - <cause>`, `@throws {400} Validation error - <cause>`.
  Cover auth failures, role/permission failures
  (`@throws {401} No Admin/Mod access - ...`), account-status gates, not-found,
  conflict/duplicate, and the final `500`.
- Mention the failure domain that produces the `500` (database, PDF generation,
  storage upload, job queue), not a generic "server error".

---

## 6. `@description Workflow:` — the numbered pipeline

This is the most important section and must mirror the code top to bottom.

- Format: ` * @description Workflow:` then ` *   1. ...`, ` *   2. ...`,
  ` *   10. ...` — the same three-space indent regardless of digit count, numbered
  continuously with no gaps or repeats.
- Start at `1.` with `Initialize server and database connection`.
- Early steps: authentication → role/permission check → account-status gate.
- Then: parse input (form data / JSON / query) → sanitize → feature-flag / global
  setting overrides → file extraction and size checks → base64/upload prep.
- Then: every validation block in code order, naming the field and the rule
  (digits, length, enum, range, decimal places, date ordering).
- Then: business calculations (fee resolution, GST breakdown, TDS, owner payout
  fixed vs percentage, company-owned branches).
- Then: ID generation, storage uploads, transaction begin.
- Then: each `INSERT`/`UPDATE`/`DELETE` in order, naming the table when the code
  names it (`manual_bookings`, `manual_booking_photos`, `manual_booking_photo_usages`).
- Then: audit log, template timestamps, commit/release, post-commit work (photo usage
  rows, PDF generation, invoice ID, mail toggles, admin email fetch, queued jobs,
  worker trigger, cache invalidation).
- Finish with the response step: `Return <status> response with <payload>` and, when
  the handler has a `catch`, a final step such as
  `Rollback transaction and release connection on error`.
- One action per step; a step may name the helper/table involved but should not paste
  code. Aim for roughly one step per 3–10 lines of handler logic — complex routes
  legitimately run to 40–50 steps.
- Preserve conditional branches as part of the step text
  (`Validate owner percentage for percentage-based payout (0–100)`), not as nested
  sub-lists.

---

## 7. Special cases

- **Multi-method files** (e.g. `GET` + `POST`): one complete block per method, each
  with its own summary, params, body/query, returns, throws and workflow.
- **Routes with dynamic segments:** document `context.params` and name the segment in
  the summary (e.g. "…for the given `userId`").
- **Public routes:** state in the workflow that no auth check exists instead of
  inventing `@throws {401}`.
- **Admin/Mod routes:** document `hasAdminOrModAccess` / `is_admin` checks and the
  distinct error messages (`"Unauthorized."`, `"Unauthorized. No Admin/Mod access"`).
- **Transactions:** document `connection.beginTransaction()`, every query on the
  connection, and commit/rollback + `release()`.
- **PDF/invoice steps:** mention which generator is used and which IDs are generated
  (`generateInvoiceId`, sequential agreement reference).
- **Job queue:** name the job constants (`SEND_MANUAL_BOOKING_AGREEMENT_INVOICE_USER`)
  and the fact that `insertJob` + `JobQueueCheckJobs` run.

---

## 8. Helpers, constants and normalizers inside a route file

Short block, immediately above the declaration:

```ts
/**
 * Normalizes any value into a trimmed string for change comparison
 *
 * @function normStr
 * @description Converts `null`/`undefined` into an empty string and coerces every
 *              other value into a trimmed string, providing a stable representation
 *              for old-vs-new equality checks in the audit log.
 *
 * @param {any} v - Value to normalize
 *
 * @returns {string} Trimmed string representation, or empty string for null/undefined
 */
```

Same rules: one-line summary, `@function`, `@description` (wrapped, aligned under the
tag text), `@param`, `@returns`. No workflow section.

---

## 9. Analysis recipe (do this before writing)

1. Read the whole file: imports first (they reveal services, PDF generators, job
   constants, cache helpers, role utils).
2. Identify the exported handler(s) and the exact signature (`req`, `context.params`).
3. Walk the body in order and note every branch that produces a response: auth →
   permission → account status → input parsing → validations → calculations →
   DB writes → side effects → return. Each becomes a workflow step.
4. Extract every field from `formData.get(...)`, the destructured JSON body, or
   `searchParams.get(...)` — including optional ones and URL fallbacks — with the
   validation constants applied to them (look up imported constants such as
   `FILE_SIZE_LIMIT`, `CAR_MINIMUM_MANUFACTURING_YEAR` for the literal numbers).
5. Note every status code and its `error`/`message` string; note transaction
   boundaries and the `catch` cleanup.
6. Only then write the block, top to bottom, in the tag order of §2.

---

## 10. Self-check before saving

- [ ] Block sits directly above the exported handler, after the imports.
- [ ] Summary is one sentence; `@async`, `@function <METHOD>` and first `@description` present.
- [ ] Every request field read by the code is documented, with optional ones in `[...]` and defaults/fallbacks stated.
- [ ] Validation numbers match the code constants exactly (digits, lengths, ranges, MB, decimals).
- [ ] `@returns` lists every top-level response key.
- [ ] `@throws` lists only status codes the handler can actually return, each with a cause.
- [ ] `@description Workflow:` mirrors the code order, starts with init, ends with the return (and rollback when applicable).
- [ ] No invented fields, tables, permissions, or "nice to have" behaviour.
- [ ] Formatting uses `*` prefixes, `@tag` lines, three-space indented continuation lines, backticks for identifiers.
- [ ] `tsc` still passes (comments only — no code changed).

---

## 11. Reusable prompt

> Read `src\assets\Documentation\README_API_DOCUMENTATION.md` and apply it to
> `src/app/api/<path>/route.ts`. Document every exported handler and any helper
> defined in the file, following the tag order and workflow rules exactly. Derive all
> fields, validation limits, tables, jobs and status codes from the actual code (read
> imported utils when a rule lives there). Do not change any code — add only JSDoc
> comments.
