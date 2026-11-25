import type { Pool, PoolConnection } from "mysql2/promise";
import type { RowDataPacket } from "mysql2";

/**
 * ═════════════════════════════════════════════════════════════════════
 *  Slug utilities — shared by every table that owns a unique slug
 * ═════════════════════════════════════════════════════════════════════
 *
 *  slugify(value)                       → "Crochet Bouquets" → "crochet-bouquets"
 *  isValidSlug(value)                   → matches the shared slug shape
 *  buildUniqueSlug(db, source, base)    → "crochet-bouquets-2" when taken
 *  isSlugTaken(db, source, slug)        → cheap uniqueness check
 *
 *  `source` is a key of SLUG_SOURCES, never a table name from the caller —
 *  that keeps the SQL identifiers fixed and injection-free.
 * ═════════════════════════════════════════════════════════════════════
 */

/** Lowercase words separated by single dashes. */
export const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Every table that stores a unique slug, with its column length. */
export const SLUG_SOURCES = {
  categories: { table: "categories", column: "slug", maxLength: 120 },
  products: { table: "products", column: "slug", maxLength: 255 },
  global_tags: { table: "global_tags", column: "slug", maxLength: 120 },
} as const;

export type SlugSource = keyof typeof SLUG_SOURCES;

/** Anything that can run a query — a Pool or a PoolConnection. */
type SlugDb = Pool | PoolConnection;

interface IdRow extends RowDataPacket {
  id: string;
}

export interface SlugifyOptions {
  /** Used when the input has no letters/digits left. Default "item". */
  fallback?: string;
  /** Hard cap on the produced slug. Default 120. */
  maxLength?: number;
}

export interface BuildSlugOptions {
  /** Row id to ignore while checking uniqueness (use on update). */
  ignoreId?: string;
  /** Fallback word when `base` is empty. Defaults to the source name. */
  fallback?: string;
  /** Give up after this many attempts. Default 200. */
  maxAttempts?: number;
}

/* ------------------------------------------------------------------ */
/*  Pure helpers                                                       */
/* ------------------------------------------------------------------ */

/**
 * Turn free text into a URL-safe slug.
 *
 *   slugify("  Crochet Bouquets ")          → "crochet-bouquets"
 *   slugify("Édition Noël")                 → "edition-noel"
 *   slugify("!!!", { fallback: "category" })→ "category"
 */
export function slugify(value: string, options: SlugifyOptions = {}): string {
  const { fallback = "item", maxLength = 120 } = options;
  const cap = Math.max(1, Math.floor(maxLength));

  const base = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, cap)
    .replace(/^-+|-+$/g, "");

  if (base) return base;

  const safeFallback = slugify(fallback, { fallback: "item", maxLength: cap });
  return safeFallback || "item";
}

/** True when `value` already is a well-formed slug. */
export function isValidSlug(value: string): boolean {
  return slugRegex.test(value);
}

/* ------------------------------------------------------------------ */
/*  Database helpers                                                   */
/* ------------------------------------------------------------------ */

/** True when another row in `source` already uses this slug. */
export async function isSlugTaken(
  db: SlugDb,
  source: SlugSource,
  slug: string,
  ignoreId = "",
): Promise<boolean> {
  const { table, column } = SLUG_SOURCES[source];

  const [rows] = await db.query<IdRow[]>(
    `SELECT id FROM \`${table}\` WHERE \`${column}\` = ? AND id <> ? LIMIT 1`,
    [slug, ignoreId],
  );

  return rows.length > 0;
}

/**
 * Build a slug that is guaranteed free in `source`, adding `-2`, `-3`, …
 * when the base is already used.
 *
 *   await buildUniqueSlug(conn, "categories", slugify(name))
 *   await buildUniqueSlug(conn, "categories", slugify(name), { ignoreId: id })
 */
export async function buildUniqueSlug(
  db: SlugDb,
  source: SlugSource,
  base: string,
  options: BuildSlugOptions = {},
): Promise<string> {
  const { ignoreId = "", fallback = source, maxAttempts = 200 } = options;
  const { maxLength } = SLUG_SOURCES[source];

  const root = slugify(base || fallback, { fallback: source, maxLength });
  let candidate = root;
  let attempt = 2;

  while (attempt <= maxAttempts) {
    if (!(await isSlugTaken(db, source, candidate, ignoreId))) return candidate;

    const suffix = `-${attempt++}`;
    candidate = `${root.slice(0, Math.max(1, maxLength - suffix.length))}${suffix}`;
  }

  throw new Error(
    `[SLUG] Could not build a unique slug for "${source}" from "${base}" after ${maxAttempts} attempts`,
  );
}
