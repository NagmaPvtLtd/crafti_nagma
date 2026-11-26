import { NextRequest, NextResponse } from "next/server";
import {
  invalidInput,
  isDuplicateEntry,
} from "../../../../../utils/Api/apiResponse.util";
import type { RowDataPacket } from "mysql2";

import { requireManager } from "../../../../../utils/Auth/Auth.requireRole.util";
import { generateULID } from "../../../../../utils/generateULID.util";
import { getPool } from "../../../../../lib/Database/main.db";
import { getCurrentDateTime } from "../../../../../utils/ValueFetcher/getDateTime.util";
import { auditLog } from "../../../../../services/AuditLog.service";
import {
  categoryCreateSchema,
  categoryDeleteSchema,
  categoryUpdateSchema,
} from "../../../../../utils/zod/product/manager.category.zod";
import {
  buildUniqueSlug,
  isSlugTaken,
  slugify,
} from "../../../../../utils/Slug/slug.util";
import { toPascalCase } from "../../../../../utils/Formator/toPascalCase.util";

/* -------------------------------------------------------------------------- */
/*  Row types — must extend RowDataPacket for mysql2's generic query()        */
/* -------------------------------------------------------------------------- */

interface CategoryRow extends RowDataPacket {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string | null;
  product_count: number | string;
  subcategory_count: number | string;
}

interface CategoryTotalsRow extends RowDataPacket {
  total: number | string;
  root: number | string;
  sub: number | string;
}

interface CategoryParentRow extends RowDataPacket {
  id: string;
  name: string;
  parent_id: string | null;
}

interface CountRow extends RowDataPacket {
  total: number | string;
}

interface ChildUsageRow extends RowDataPacket {
  id: string;
  name: string;
  product_count: number | string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const CATEGORY_SELECT = `
  SELECT c.id, c.name, c.slug, c.parent_id, c.created_at, c.updated_at,
         (SELECT COUNT(*) FROM product_categories pc
           WHERE pc.category_id = c.id)                      AS product_count,
         (SELECT COUNT(*) FROM categories ch
           WHERE ch.parent_id = c.id)                        AS subcategory_count
    FROM categories c`;

/** Fallback word used when a category name has no slug-able characters. */
const slugFallback = "category";

function mapCategory(row: CategoryRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    parentId: row.parent_id,
    productCount: Number(row.product_count ?? 0),
    subcategoryCount: Number(row.subcategory_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/* -------------------------------------------------------------------------- */
/*  GET /api/manager/product-studio/categories                                */
/*  Flat list (ordered by name) + totals for the hub / page stat strip.       */
/* -------------------------------------------------------------------------- */

/**
 * Lists every category as a flat array together with stat-strip totals.
 *
 * @async
 * @function GET
 * @description Reads `categories` with per-category product and subcategory counts behind the
 *              manager guard, plus table-wide totals (all, root, sub) and the number of
 *              `product_categories` assignments. No filtering or pagination is applied.
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - counts: `total`, `root`, `sub` and `productsAssigned`
 *   - categories: each with `id`, `name`, `slug`, `parentId`, `productCount`,
 *                 `subcategoryCount`, `createdAt` and `updatedAt`, ordered by name
 *
 * @throws {401} Unauthorized - No session
 * @throws {403} Forbidden - Account not active, no role, or role below manager
 * @throws {500} `server_error` - Database failure while reading `categories`
 *
 * @description Workflow:
 *   1. Initialize the manager guard (session, active status, role rank)
 *   2. Initialize the database pool and take a connection
 *   3. Select categories with `product_count` and `subcategory_count` subqueries
 *   4. Count total, root and sub categories
 *   5. Count `product_categories` assignments
 *   6. Normalize the MySQL aggregates with `Number`
 *   7. Return 200 response with counts and mapped categories
 *   8. Release the connection in `finally`
 */
export async function GET() {
  const guard = await requireManager({
    label: "GET /api/manager/product-studio/categories",
  });
  if (!guard.ok) return guard.response;

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query<CategoryRow[]>(
      `${CATEGORY_SELECT}
       ORDER BY c.name ASC`,
    );

    const [totals] = await conn.query<CategoryTotalsRow[]>(
      `SELECT COUNT(*)                  AS total,
              SUM(parent_id IS NULL)    AS root,
              SUM(parent_id IS NOT NULL) AS sub
         FROM categories`,
    );

    const [assigned] = await conn.query<CountRow[]>(
      `SELECT COUNT(*) AS total FROM product_categories`,
    );

    const t = totals[0] ?? ({} as Partial<CategoryTotalsRow>);

    return NextResponse.json({
      ok: true,
      counts: {
        total: Number(t.total ?? 0),
        root: Number(t.root ?? 0),
        sub: Number(t.sub ?? 0),
        productsAssigned: Number(assigned[0]?.total ?? 0),
      },
      categories: rows.map(mapCategory),
    });
  } catch (err) {
    console.error("[GLOBAL CATEGORIES - LIST - GET]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  } finally {
    conn.release();
  }
}

/* -------------------------------------------------------------------------- */
/*  POST /api/manager/product-studio/categories                               */
/*  Create a category, or a sub category when parentId is provided.           */
/* -------------------------------------------------------------------------- */

/**
 * Creates a category, or a sub category when `parentId` is given.
 *
 * @async
 * @function POST
 * @description Validates with `categoryCreateSchema`, stores the display name in Pascal case,
 *              and enforces the two-level rule: a parent must exist and must itself be a root.
 *              When a slug is supplied it must be free; otherwise a unique slug is built from
 *              `slugify(name)` with the `category` fallback. The new row is inserted into
 *              `categories` with a `cat` ULID id, then audited.
 *
 * @param {NextRequest} req - The incoming HTTP request with a JSON body
 * @body {string} name - Display name (2-100 chars, stored in Pascal case)
 * @body {string} [slug] - Slug (max 120 chars, lowercase words separated by dashes);
 *                         omitted or empty means "build a unique one from the name"
 * @body {string|null} [parentId] - Parent category id (10-40 chars); empty or null means root
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - message: "Category created" or "Sub category created"
 *   - category: the created category row, or `null`
 *
 * @throws {400} Validation failed - Schema errors, unknown parent, nested parent, taken slug
 * @throws {401} Unauthorized - No session, role too low, or session without a user id
 * @throws {403} Forbidden - Account not active or no role assigned
 * @throws {500} `server_error` - Database failure while reading or inserting `categories`
 *
 * @description Workflow:
 *   1. Initialize the manager guard and read the manager id, returning 401 when missing
 *   2. Parse the JSON body and validate it with `categoryCreateSchema`
 *   3. Convert the name with `toPascalCase`
 *   4. Initialize the database pool and take a connection
 *   5. When `parentId` is set, load the parent and reject a missing parent
 *   6. Reject a parent that itself has a `parent_id` (two levels only)
 *   7. When a slug is supplied, check `isSlugTaken` and reject a duplicate
 *   8. Otherwise build a unique slug with `buildUniqueSlug` and the `category` fallback
 *   9. Generate the `cat` ULID and current timestamp
 *   10. Insert into `categories` (creator recorded, `updated_by` null)
 *   11. Re-read the created row through `CATEGORY_SELECT`
 *   12. Write a CREATE / CATEGORY audit entry, swallowing audit errors
 *   13. Return 201 response with the created category
 *   14. Map `ER_DUP_ENTRY` to a slug field error, else 500
 *   15. Release the connection in `finally`
 */
export async function POST(req: NextRequest) {
  const guard = await requireManager({
    label: "POST /api/manager/product-studio/categories",
  });
  if (!guard.ok) return guard.response;

  const managerId = guard.session.user.id;
  if (!managerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = categoryCreateSchema.safeParse(json);
  if (!parsed.success) {
    return invalidInput(parsed.error.flatten().fieldErrors);
  }
  const { name: rawName, slug, parentId } = parsed.data;
  /** Display names are always stored in Pascal case. */
  const name = toPascalCase(rawName);

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    /* ---- parent must exist and be a root (two levels max) ---- */
    if (parentId) {
      const [parentRows] = await conn.query<CategoryParentRow[]>(
        `SELECT id, name, parent_id FROM categories WHERE id = ? LIMIT 1`,
        [parentId],
      );
      const parent = parentRows[0];
      if (!parent) {
        return invalidInput({ parentId: ["Parent category not found"] });
      }
      if (parent.parent_id) {
        return invalidInput({
          parentId: ["Sub categories cannot be nested any deeper"],
        });
      }
    }

    /* ---- slug: honour the given one, otherwise derive a unique one ---- */
    let finalSlug: string;
    if (slug) {
      if (await isSlugTaken(conn, "categories", slug)) {
        return invalidInput({ slug: ["Slug already in use"] });
      }
      finalSlug = slug;
    } else {
      finalSlug = await buildUniqueSlug(
        conn,
        "categories",
        slugify(name, { fallback: slugFallback }),
      );
    }

    /* ---- insert ---- */
    const id = generateULID("cat");
    const now = getCurrentDateTime();

    await conn.query(
      `INSERT INTO categories
         (id, name, slug, parent_id, created_by, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?, NULL)`,
      [id, name, finalSlug, parentId, managerId, now],
    );

    const [createdRows] = await conn.query<CategoryRow[]>(
      `${CATEGORY_SELECT} WHERE c.id = ? LIMIT 1`,
      [id],
    );

    try {
      await auditLog.log(pool, {
        userId: managerId,
        action: "CREATE",
        entityType: "CATEGORY",
        entityId: id,
        description: `Category created. [id=${id}, name=${name}, slug=${finalSlug}, parentId=${parentId ?? "root"}]`,
      });
    } catch {
      /* audit must never break the response */
    }

    return NextResponse.json(
      {
        ok: true,
        message: parentId ? "Sub category created" : "Category created",
        category: createdRows[0] ? mapCategory(createdRows[0]) : null,
      },
      { status: 201 },
    );
  } catch (err) {
    if (isDuplicateEntry(err)) {
      return invalidInput({ slug: ["Slug already in use"] });
    }
    console.error("[GLOBAL CATEGORIES - CREATE - POST]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  } finally {
    conn.release();
  }
}

/* -------------------------------------------------------------------------- */
/*  PUT /api/manager/product-studio/categories                                */
/*  Rename / re-slug / move a category. Body must include its id.             */
/* -------------------------------------------------------------------------- */

/**
 * Renames, re-slugs or moves a category.
 *
 * @async
 * @function PUT
 * @description Validates with `categoryUpdateSchema` (the body carries the category `id`). The
 *              two-level rule is re-checked: a category cannot be its own parent, a category
 *              that already has sub categories cannot be moved under another parent, and the
 *              new parent must exist and be a root. A changed slug must be free; an omitted
 *              slug rebuilds a unique one from the name, while an unchanged slug is kept.
 *
 * @param {NextRequest} req - The incoming HTTP request with a JSON body
 * @body {string} id - Category id (10-40 chars)
 * @body {string} name - Display name (2-100 chars)
 * @body {string} [slug] - Slug (max 120 chars, lowercase words separated by dashes);
 *                         omitted or empty rebuilds a unique slug from the name
 * @body {string|null} [parentId] - Parent category id (10-40 chars); empty or null means root
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - message: "Category updated"
 *   - category: the updated category row, or `null`
 *
 * @throws {400} Validation failed - Schema errors, own-parent, nested parent, deeper nesting,
 *               taken slug
 * @throws {401} Unauthorized - No session, role too low, or session without a user id
 * @throws {403} Forbidden - Account not active or no role assigned
 * @throws {404} "Category not found"
 * @throws {500} `server_error` - Database failure while reading or updating `categories`
 *
 * @description Workflow:
 *   1. Initialize the manager guard and read the manager id, returning 401 when missing
 *   2. Parse the JSON body and validate it with `categoryUpdateSchema`
 *   3. Initialize the database pool and take a connection
 *   4. Load the existing category through `CATEGORY_SELECT`, returning 404 when missing
 *   5. Reject `parentId === id`
 *   6. Reject a move while the category still has sub categories
 *   7. Load the new parent and reject a missing parent or a non-root parent
 *   8. Resolve the slug: changed and free, rebuilt when omitted, kept when unchanged
 *   9. Update `categories` (name, slug, parent, `updated_by`, `updated_at`)
 *   10. Re-read the updated row through `CATEGORY_SELECT`
 *   11. Write an UPDATE / CATEGORY audit entry, swallowing audit errors
 *   12. Return 200 response with the updated category
 *   13. Map `ER_DUP_ENTRY` to a slug field error, else 500
 *   14. Release the connection in `finally`
 */
export async function PUT(req: NextRequest) {
  const guard = await requireManager({
    label: "PUT /api/manager/product-studio/categories",
  });
  if (!guard.ok) return guard.response;

  const managerId = guard.session.user.id;
  if (!managerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = categoryUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return invalidInput(parsed.error.flatten().fieldErrors);
  }
  const { id, name, slug, parentId } = parsed.data;

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const [existingRows] = await conn.query<CategoryRow[]>(
      `${CATEGORY_SELECT} WHERE c.id = ? LIMIT 1`,
      [id],
    );
    const existing = existingRows[0];
    if (!existing) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    /* ---- parent rules ---- */
    if (parentId) {
      if (parentId === id) {
        return invalidInput({
          parentId: ["A category cannot be its own parent"],
        });
      }

      if (Number(existing.subcategory_count ?? 0) > 0) {
        return invalidInput({
          parentId: [
            "This category has sub categories — only two levels are allowed",
          ],
        });
      }

      const [parentRows] = await conn.query<CategoryParentRow[]>(
        `SELECT id, name, parent_id FROM categories WHERE id = ? LIMIT 1`,
        [parentId],
      );
      const parent = parentRows[0];
      if (!parent) {
        return invalidInput({ parentId: ["Parent category not found"] });
      }
      if (parent.parent_id) {
        return invalidInput({
          parentId: ["Sub categories cannot be nested any deeper"],
        });
      }
    }

    /* ---- slug ---- */
    let finalSlug: string;
    if (slug && slug !== existing.slug) {
      if (await isSlugTaken(conn, "categories", slug, id)) {
        return invalidInput({ slug: ["Slug already in use"] });
      }
      finalSlug = slug;
    } else if (!slug) {
      finalSlug = await buildUniqueSlug(
        conn,
        "categories",
        slugify(name, { fallback: slugFallback }),
        { ignoreId: id },
      );
    } else {
      finalSlug = existing.slug;
    }

    const now = getCurrentDateTime();

    await conn.query(
      `UPDATE categories
          SET name = ?, slug = ?, parent_id = ?,
              updated_by = ?, updated_at = ?
        WHERE id = ?`,
      [name, finalSlug, parentId, managerId, now, id],
    );

    const [updatedRows] = await conn.query<CategoryRow[]>(
      `${CATEGORY_SELECT} WHERE c.id = ? LIMIT 1`,
      [id],
    );

    try {
      await auditLog.log(pool, {
        userId: managerId,
        action: "UPDATE",
        entityType: "CATEGORY",
        entityId: id,
        description: `Category updated. [id=${id}, name=${name}, slug=${finalSlug}, parentId=${parentId ?? "root"}]`,
      });
    } catch {
      /* audit must never break the response */
    }

    return NextResponse.json({
      ok: true,
      message: "Category updated",
      category: updatedRows[0] ? mapCategory(updatedRows[0]) : null,
    });
  } catch (err) {
    if (isDuplicateEntry(err)) {
      return invalidInput({ slug: ["Slug already in use"] });
    }
    console.error("[GLOBAL CATEGORIES - UPDATE - PUT]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  } finally {
    conn.release();
  }
}

/* -------------------------------------------------------------------------- */
/*  DELETE /api/manager/product-studio/categories?id=<id>                     */
/*  Refused only while products still use the category or a sub category;     */
/*  unused sub categories are deleted together with their parent.             */
/* -------------------------------------------------------------------------- */

/**
 * Deletes a category once no product uses it, taking its unused sub categories along.
 *
 * @async
 * @function DELETE
 * @description Reads the id from `?id=` first and falls back to a JSON body `id`, validates it
 *              with `categoryDeleteSchema`, then refuses with 409 while the category or any of
 *              its sub categories is still assigned through `product_categories`. Unused sub
 *              categories are deleted with the parent, so an unused branch never gets stuck.
 *
 * @param {NextRequest} req - The incoming HTTP request with `?id=` or a JSON body
 * @query {string} id - Category id (10-40 chars); used when present, otherwise the body id wins
 * @body {string} [id] - Category id, read only when the query string has none (10-40 chars)
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - message: "Category deleted"
 *   - deletedId: the removed category id
 *
 * @throws {400} Validation failed - `id` is missing or not a valid category id
 * @throws {401} Unauthorized - No session, role too low, or session without a user id
 * @throws {403} Forbidden - Account not active or no role assigned
 * @throws {404} "Category not found"
 * @throws {409} The category is assigned to products, or one of its sub categories is
 * @throws {500} `server_error` - Database failure while reading or deleting `categories`
 *
 * @description Workflow:
 *   1. Initialize the manager guard and read the manager id, returning 401 when missing
 *   2. Read `id` from the query string, falling back to the parsed JSON body
 *   3. Validate with `categoryDeleteSchema`
 *   4. Initialize the database pool and take a connection
 *   5. Load the category through `CATEGORY_SELECT`, returning 404 when missing
 *   6. Return 409 with the product count when products still reference the category itself
 *   7. When sub categories exist, load each child's `product_categories` count and return 409
 *      naming the sub categories that are assigned to products
 *   8. Delete the unused sub categories (`DELETE FROM categories WHERE parent_id = ?`)
 *   9. Delete the row from `categories`
 *   10. Write a DELETE / CATEGORY audit entry with name and slug, swallowing audit errors
 *   11. Return 200 response with `ok`, `message` and `deletedId`
 *   12. Release the connection in `finally`
 */
export async function DELETE(req: NextRequest) {
  const guard = await requireManager({
    label: "DELETE /api/manager/product-studio/categories",
  });
  if (!guard.ok) return guard.response;

  const managerId = guard.session.user.id;
  if (!managerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const rawId =
    req.nextUrl.searchParams.get("id") ??
    (body && typeof body === "object" && "id" in body
      ? String((body as { id?: unknown }).id ?? "")
      : "");

  const parsed = categoryDeleteSchema.safeParse({ id: rawId });
  if (!parsed.success) {
    return invalidInput({ id: ["A valid category id is required"] });
  }
  const { id } = parsed.data;

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const [existingRows] = await conn.query<CategoryRow[]>(
      `${CATEGORY_SELECT} WHERE c.id = ? LIMIT 1`,
      [id],
    );
    const existing = existingRows[0];
    if (!existing) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    const productCount = Number(existing.product_count ?? 0);
    if (productCount > 0) {
      return NextResponse.json(
        {
          error: `"${existing.name}" is assigned to ${productCount} product${productCount === 1 ? "" : "s"}. Reassign them before deleting.`,
        },
        { status: 409 },
      );
    }

    /*
     * A main category goes away together with its sub categories, but only when
     * none of them is used by a product — an unused sub category must never be
     * a reason to keep the whole branch alive.
     */
    const subCount = Number(existing.subcategory_count ?? 0);
    if (subCount > 0) {
      const [childRows] = await conn.query<ChildUsageRow[]>(
        `SELECT c.id, c.name,
                (SELECT COUNT(*) FROM product_categories pc
                  WHERE pc.category_id = c.id) AS product_count
           FROM categories c
          WHERE c.parent_id = ?`,
        [id],
      );

      const usedChildren = childRows.filter(
        (child) => Number(child.product_count ?? 0) > 0,
      );
      if (usedChildren.length > 0) {
        const names = usedChildren.map((child) => `"${child.name}"`).join(", ");
        return NextResponse.json(
          {
            error: `${names} ${usedChildren.length === 1 ? "is" : "are"} assigned to products. Reassign ${usedChildren.length === 1 ? "it" : "them"} before deleting "${existing.name}".`,
          },
          { status: 409 },
        );
      }

      await conn.query(`DELETE FROM categories WHERE parent_id = ?`, [id]);
    }

    await conn.query(`DELETE FROM categories WHERE id = ?`, [id]);

    try {
      await auditLog.log(pool, {
        userId: managerId,
        action: "DELETE",
        entityType: "CATEGORY",
        entityId: id,
        description: `Category deleted. [id=${id}, name=${existing.name}, slug=${existing.slug}]`,
      });
    } catch {
      /* audit must never break the response */
    }

    return NextResponse.json({
      ok: true,
      message: "Category deleted",
      deletedId: id,
    });
  } catch (err) {
    console.error("[GLOBAL CATEGORIES - DELETE]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  } finally {
    conn.release();
  }
}
