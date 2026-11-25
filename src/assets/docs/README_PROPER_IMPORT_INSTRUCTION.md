# Import Style — AI Instructions (keep in mind)

**Read this before writing or editing any import in this codebase.**
These are rules for the AI, not a description of the whole project.

---

## 1. Only one import style is allowed

- Use **relative imports only**: `./`, `../`, `../../`, `../../../`, … based on the file's real location.
- **Never use `@/` path-alias imports** (e.g. `from "@/utils/..."`, `from "@/lib/..."`). The project does not want this style.
- Do not invent a new alias or wrapper import style. If you see `@/` in existing code, treat it as something to fix, not something to copy.

---

## 2. How to get the relative path right

Relative imports resolve **from the file's own directory**, so the number of `../` segments depends on how deep the file is.

Do **not** guess the depth by counting `src/` in the path. Instead:

- Compute the relative path from the file's directory to the target file's location inside `src/`.
- Prefer to verify the depth against a nearby file that already imports the same target, but only if that nearby file is at a similar depth — different folders can need different numbers of `../`.
- When in doubt, derive it from the actual directory structure rather than reusing a number you saw elsewhere.

A short depth heuristic that matches this tree:

- Files inside `src/app/api/...` usually need **more** `../` to reach `src/utils`, `src/lib`, `src/services`, `src/types` than files inside `src/app/(components)/...`, because the `api/` branch is deeper relative to those roots in this layout.
- Files inside `src/app/(components)/...` often reach `src/utils/...` with **fewer** `../` than the `api/` files.

So: **do not copy an import depth from another file unless you have checked that the two files sit at the same depth relative to the target.** Two files can both import `utils/Auth/...` and still need different `../` counts.

---

## 3. What "relative" means here

- A relative import is written as a normal relative path from the current file to the target module, with forward slashes, ending in the file name (usually `.ts` / `.tsx`).
- Sibling files: `./OtherFile`.
- Parent folder: `../`.
- Reach a target deeper under `src/`: count `../` from the current file up to `src/`, then back down to the target.

---

## 4. Common mistakes to avoid

- Do not use `@/` even if the existing docs or an older file used it — this project wants plain relative imports.
- Do not assume all files import `src/utils/...` with the same number of `../`.
- Do not trust a depth you used in one folder and paste it into a different folder.
- Do not write an import that lands inside `src/app/...` when the target is really under `src/utils/`, `src/lib/`, `src/services/`, or `src/types/`.
- Do not import from a file that does not exist just to keep an import style consistent.

---

## 5. When you touch imports

- Read the actual current file before changing its imports.
- After changing imports, make sure the target path really exists at the place your import now points to.
- If an existing import was already relative, keep it relative and only adjust it if the file moved or the target changed.

---

## 6. Short version for the AI

- Relative imports only.
- No `@/`.
- Depth is file-position-dependent — recompute it per file, do not blindly copy from neighbors.
- Verify the resolved target exists before finishing.

---

*This file is an AI instruction note. It is intentionally short. It is not a full codebase import catalogue.*
