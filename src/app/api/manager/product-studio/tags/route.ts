import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import {
  isDuplicateEntry,
  invalidInput,
} from "../../../../../utils/Api/apiResponse.util";

import { requireManager } from "../../../../../utils/Auth/Auth.requireRole.util";
import { getPool } from "../../../../../lib/Database/main.db";
import { getCurrentDateTime } from "../../../../../utils/ValueFetcher/getDateTime.util";
import { generateULID } from "../../../../../utils/generateULID.util";
import { auditLog } from "../../../../../services/AuditLog.service";
import { tagCreateSchema } from "../../../../../utils/zod/product/manager.tag.zod";
import type {
  TagListItem,
  TagListResponse,
} from "../../../../../utils/zod/product/manager.tag.zod";
import {
  buildTagSlug,
  normalizeTagName,
} from "../../../../../utils/Tags/tag.util";

/* -------------------------------------------------------------------------- */
/*  Row types                                                                 */
/* -------------------------------------------------------------------------- */

interface TagRow extends RowDataPacket {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  product_count: number | string;
  variant_count: number | string;
}

/* -------------------------------------------------------------------------- */
/*  GET /api/manager/product-studio/tags                                      */
/*  Every global tag with its usage, optionally filtered by a search term.    */
/* -------------------------------------------------------------------------- */

/**
 * Lists every global tag with its product and variant usage.
 *
 * @async
 * @function GET
 * @description Manager-only read of the `global_tags` master. Each tag carries
 *              `productCount` (rows in `product_tag_mappings`) and `variantCount`
 *              (rows in `product_variant_tag_mappings`); `totalUsage` is their sum.
 *              An optional `search` narrows by partial name — the database
 *              collation decides case-insensitivity. This route only reads.
 *
 * @param {NextRequest} req - The incoming HTTP request
 *
 * @query {string} [search] - Partial tag name to filter by (trimmed; empty means all)
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - tags: up to 500 tags ordered by name, each `{ id, name, slug, createdAt,
 *           usage: { productCount, variantCount, totalUsage } }`
 *   - total: number of tags in this response
 *
 * @throws {401} Unauthorized - No session, role below manager, or session without a user id
 * @throws {403} Forbidden - Account not active or no role assigned
 * @throws {500} "Could not load the tags" - Database failure
 *
 * @description Workflow:
 *   1. Initialize the manager guard (session, active status, role rank)
 *   2. Read and trim `search` from the query string and build its `LIKE` pattern
 *   3. Initialize the database pool and take a connection
 *   4. Select `global_tags` with product and variant mapping counts, filtered by name and ordered by name (limit 500)
 *   5. Map each row to `TagListItem`, converting counts with `Number(...)` and summing `totalUsage`
 *   6. Return 200 response with `ok`, `tags` and `total`
 *   7. Release the connection in `finally`
 */
export async function GET(req: NextRequest) {
  const guard = await requireManager({
    label: "GET /api/manager/product-studio/tags",
  });
  if (!guard.ok) return guard.response;

  const search = (req.nextUrl.searchParams.get("search") ?? "").trim();
  const like = `%${search}%`;

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query<TagRow[]>(
      `SELECT t.id, t.name, t.slug, t.created_at,
              (SELECT COUNT(*) FROM product_tag_mappings ptm
                WHERE ptm.tag_id = t.id) AS product_count,
              (SELECT COUNT(*) FROM product_variant_tag_mappings pvtm
                WHERE pvtm.tag_id = t.id) AS variant_count
         FROM global_tags t
        WHERE ? = '' OR t.name LIKE ?
        ORDER BY t.name ASC
        LIMIT 500`,
      [search, like],
    );

    const tags: TagListItem[] = rows.map((row) => {
      const productCount = Number(row.product_count ?? 0);
      const variantCount = Number(row.variant_count ?? 0);
      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        createdAt: row.created_at,
        usage: {
          productCount,
          variantCount,
          totalUsage: productCount + variantCount,
        },
      };
    });

    const payload: TagListResponse = {
      ok: true,
      tags,
      total: tags.length,
    };
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[TAGS - GET]", err);
    return NextResponse.json(
      { error: "Could not load the tags" },
      { status: 500 },
    );
  } finally {
    conn.release();
  }
}

/* -------------------------------------------------------------------------- */
/*  POST /api/manager/product-studio/tags                                     */
/*  Creates a tag, or reuses the existing one with the same name/slug.        */
/* -------------------------------------------------------------------------- */

/**
 * Creates a global tag, reusing the existing tag with the same name.
 *
 * @async
 * @function POST
 * @description Validates the name with `tagCreateSchema` (trimmed, whitespace
 *              collapsed, 1–100 characters) and reuses any `global_tags` row with
 *              the same name (case-insensitive through the DB collation) instead of
 *              creating a duplicate. A new tag gets a `tag` ULID, a unique slug from
 *              `buildTagSlug` (`SLUG_SOURCES.global_tags`) and a CREATE / `TAG` audit
 *              entry. A concurrent insert that wins the race is caught through
 *              `ER_DUP_ENTRY` and answered with the existing row.
 *
 * @param {NextRequest} req - The incoming HTTP request with a JSON body
 *
 * @body {string} name - Tag name (1–100 characters, trimmed, inner whitespace collapsed)
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - message: "Tag created" (201) or "Tag already exists" (200)
 *   - tag: `{ id, name, slug }`
 *
 * @throws {400} Validation failed - Empty name or more than 100 characters
 * @throws {401} Unauthorized - No session, role below manager, or session without a user id
 * @throws {403} Forbidden - Account not active or no role assigned
 * @throws {500} "Could not create the tag" - Database failure
 *
 * @description Workflow:
 *   1. Initialize the manager guard and read the manager id, returning 401 when missing
 *   2. Parse the JSON body and validate it with `tagCreateSchema`
 *   3. Normalize the name with `normalizeTagName`
 *   4. Initialize the database pool and take a connection
 *   5. Look for an existing `global_tags` row with the same name and return it with "Tag already exists"
 *   6. Generate the `tag` ULID, the timestamp and a unique slug
 *   7. Insert the row into `global_tags`
 *   8. Write a CREATE / `TAG` audit entry, swallowing audit errors
 *   9. Return 201 response with the created tag
 *   10. On `ER_DUP_ENTRY`, re-read the row by name and return it as an existing tag; otherwise return 500
 *   11. Release the connection in `finally`
 */
export async function POST(req: NextRequest) {
  const guard = await requireManager({
    label: "POST /api/manager/product-studio/tags",
  });
  if (!guard.ok) return guard.response;

  const managerId = guard.session.user.id;
  if (!managerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = tagCreateSchema.safeParse(json);
  if (!parsed.success) {
    return invalidInput(parsed.error.flatten().fieldErrors);
  }

  const name = normalizeTagName(parsed.data.name);
  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    /* Case-insensitive reuse: the DB collation decides what "same" means. */
    const [existing] = await conn.query<TagRow[]>(
      `SELECT id, name, slug, created_at FROM global_tags
        WHERE name = ? LIMIT 1`,
      [name],
    );
    if (existing[0]) {
      return NextResponse.json({
        ok: true,
        message: "Tag already exists",
        tag: {
          id: existing[0].id,
          name: existing[0].name,
          slug: existing[0].slug,
        },
      });
    }

    const id = generateULID("tag");
    const now = getCurrentDateTime();
    const slug = await buildTagSlug(conn, name);

    await conn.query(
      `INSERT INTO global_tags
         (id, name, slug, created_by, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, ?, NULL)`,
      [id, name, slug, managerId, now],
    );

    try {
      await auditLog.log(pool, {
        userId: managerId,
        action: "CREATE",
        entityType: "TAG",
        entityId: id,
        description: `Global tag created. [id=${id}, name=${name}, slug=${slug}]`,
      });
    } catch {
      /* audit must never break the response */
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Tag created",
        tag: { id, name, slug },
      },
      { status: 201 },
    );
  } catch (err) {
    if (isDuplicateEntry(err)) {
      /* A concurrent request created it between the check and the insert. */
      const [rows] = await conn.query<TagRow[]>(
        `SELECT id, name, slug, created_at FROM global_tags
          WHERE name = ? LIMIT 1`,
        [name],
      );
      if (rows[0]) {
        return NextResponse.json({
          ok: true,
          message: "Tag already exists",
          tag: { id: rows[0].id, name: rows[0].name, slug: rows[0].slug },
        });
      }
    }
    console.error("[TAGS - POST]", err);
    return NextResponse.json(
      { error: "Could not create the tag" },
      { status: 500 },
    );
  } finally {
    conn.release();
  }
}
