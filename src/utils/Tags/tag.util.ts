import type { Pool, PoolConnection, ResultSetHeader } from "mysql2/promise";
import type { RowDataPacket } from "mysql2";

import { buildUniqueSlug, slugify } from "../Slug/slug.util";

/**
 * ═════════════════════════════════════════════════════════════════════
 *  Global tags — shared helpers
 * ═════════════════════════════════════════════════════════════════════
 *
 *  `global_tags` is one reusable tag master. Products and variants only
 *  reference it through two explicit mapping tables:
 *
 *    product_tag_mappings          base product tags (inherited by variants)
 *    product_variant_tag_mappings  variant-specific additional tags
 *
 *  Inherited tags are never copied into the variant mapping table; the
 *  effective variant tags are assembled at read time.
 * ═════════════════════════════════════════════════════════════════════
 */

export type TagDb = Pool | PoolConnection;

export type TagRef = {
  id: string;
  name: string;
  slug: string;
};

interface TagRow extends RowDataPacket {
  id: string;
  name: string;
  slug: string;
}

/** Maximum number of tags allowed on one product or one variant. */
export const MAX_TAGS = 15;

/** Trim, collapse inner whitespace and hard-cap at 100 characters. */
export function normalizeTagName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, 100);
}

/** URL-safe, unique slug for a tag name. */
export async function buildTagSlug(
  db: TagDb,
  name: string,
  ignoreId = "",
): Promise<string> {
  return buildUniqueSlug(
    db,
    "global_tags",
    slugify(name, { fallback: "tag", maxLength: 120 }),
    { ignoreId, fallback: "tag", maxAttempts: 200 },
  );
}

/** De-duplicates and length-checks a list of tag ids from a request. */
export function uniqueTagIds(tagIds: string[]): string[] {
  return [...new Set(tagIds.map((id) => id.trim()).filter(Boolean))];
}

/** Removes tags already inherited from the variant's base product. */
export function excludeInheritedTagIds(
  tagIds: string[],
  inheritedTagIds: ReadonlySet<string>,
): string[] {
  return tagIds.filter((tagId) => !inheritedTagIds.has(tagId));
}

/**
 * Loads every tag referenced by the given ids.
 * Returns a map keyed by id — a missing id simply never appears in it, so
 * the caller can reject the request when the counts differ.
 */
export async function loadTagsByIds(
  db: TagDb,
  tagIds: string[],
): Promise<Map<string, TagRef>> {
  const map = new Map<string, TagRef>();
  if (tagIds.length === 0) return map;

  const [rows] = await db.query<TagRow[]>(
    `SELECT id, name, slug FROM global_tags WHERE id IN (?)`,
    [tagIds],
  );
  for (const row of rows) {
    map.set(row.id, { id: row.id, name: row.name, slug: row.slug });
  }
  return map;
}

/**
 * Replaces one owner's tag mapping rows inside the caller's transaction.
 *
 * @param table   `product_tag_mappings` or `product_variant_tag_mappings`
 * @param column  `product_id` or `variant_id`
 */
export async function replaceTagMappings(
  conn: PoolConnection,
  table: "product_tag_mappings" | "product_variant_tag_mappings",
  column: "product_id" | "variant_id",
  ownerId: string,
  tagIds: string[],
  now: string,
): Promise<void> {
  await conn.query(`DELETE FROM ${table} WHERE ${column} = ?`, [ownerId]);

  if (tagIds.length === 0) return;

  await conn.query(
    `INSERT INTO ${table} (${column}, tag_id, created_at) VALUES ?`,
    [tagIds.map((tagId) => [ownerId, tagId, now])],
  );
}

/**
 * Deletes every global tag that no product and no variant references any
 * more. Called after product/variant tag edits so unused tags never pile up.
 *
 * @returns the number of removed tags
 */
export async function pruneUnusedTags(db: TagDb): Promise<number> {
  const [result] = await db.query<ResultSetHeader>(
    `DELETE t
       FROM global_tags t
      WHERE NOT EXISTS (
              SELECT 1 FROM product_tag_mappings ptm WHERE ptm.tag_id = t.id
            )
        AND NOT EXISTS (
              SELECT 1 FROM product_variant_tag_mappings pvtm
               WHERE pvtm.tag_id = t.id
            )`,
  );
  return result.affectedRows ?? 0;
}

/** Tags assigned to a base product, in name order. */
export async function loadProductTags(
  db: TagDb,
  productId: string,
): Promise<TagRef[]> {
  const [rows] = await db.query<TagRow[]>(
    `SELECT t.id, t.name, t.slug
       FROM product_tag_mappings ptm
       JOIN global_tags t ON t.id = ptm.tag_id
      WHERE ptm.product_id = ?
      ORDER BY t.name ASC`,
    [productId],
  );
  return rows.map((row) => ({ id: row.id, name: row.name, slug: row.slug }));
}

/** Tags assigned directly to a variant (additional, not inherited). */
export async function loadVariantTags(
  db: TagDb,
  variantId: string,
): Promise<TagRef[]> {
  const [rows] = await db.query<TagRow[]>(
    `SELECT t.id, t.name, t.slug
       FROM product_variant_tag_mappings pvtm
       JOIN global_tags t ON t.id = pvtm.tag_id
      WHERE pvtm.variant_id = ?
      ORDER BY t.name ASC`,
    [variantId],
  );
  return rows.map((row) => ({ id: row.id, name: row.name, slug: row.slug }));
}

/** Removes variant mappings that duplicate a tag inherited from their product. */
export async function removeDuplicateVariantTagMappings(
  db: TagDb,
  productId: string,
): Promise<number> {
  const [result] = await db.query<ResultSetHeader>(
    `DELETE FROM product_variant_tag_mappings
      WHERE EXISTS (
              SELECT 1
                FROM product_variants v
                JOIN product_tag_mappings ptm
                  ON ptm.product_id = v.product_id
               WHERE v.id = product_variant_tag_mappings.variant_id
                 AND v.product_id = ?
                 AND ptm.tag_id = product_variant_tag_mappings.tag_id
            )`,
    [productId],
  );
  return result.affectedRows ?? 0;
}
