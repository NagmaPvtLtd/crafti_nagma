import { NextRequest, NextResponse } from "next/server";
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

function invalidInput(details: Record<string, string[]>) {
  return NextResponse.json(
    { error: "Validation failed", details },
    { status: 400 },
  );
}

function isDuplicateEntry(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "ER_DUP_ENTRY"
  );
}

/* -------------------------------------------------------------------------- */
/*  GET /api/manager/product-studio/categories                                */
/*  Flat list (ordered by name) + totals for the hub / page stat strip.       */
/* -------------------------------------------------------------------------- */

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
        return invalidInput({ parentId: ["A category cannot be its own parent"] });
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
/*  Blocked while the category still has sub categories or products.          */
/* -------------------------------------------------------------------------- */

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

    const subCount = Number(existing.subcategory_count ?? 0);
    if (subCount > 0) {
      return NextResponse.json(
        {
          error: `"${existing.name}" still has ${subCount} sub categor${subCount === 1 ? "y" : "ies"}. Delete or move them first.`,
        },
        { status: 409 },
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
