import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { invalidInput } from "../../../../../../utils/Api/apiResponse.util";

import { requireManager } from "../../../../../../utils/Auth/Auth.requireRole.util";
import { getPool } from "../../../../../../lib/Database/main.db";
import { getCurrentDateTime } from "../../../../../../utils/ValueFetcher/getDateTime.util";
import { auditLog } from "../../../../../../services/AuditLog.service";
import { tagUpdateSchema } from "../../../../../../utils/zod/product/manager.tag.zod";
import {
  buildTagSlug,
  normalizeTagName,
} from "../../../../../../utils/Tags/tag.util";

interface TagRow extends RowDataPacket {
  id: string;
  name: string;
  slug: string;
}

interface UsageRow extends RowDataPacket {
  product_count: number | string;
  variant_count: number | string;
}

/**
 * Renames a global tag and regenerates its slug for the given `tagId`.
 *
 * @async
 * @function PUT
 * @description Manager-only rename of one `global_tags` row. The tag id stays the
 *              same, so every `product_tag_mappings` and
 *              `product_variant_tag_mappings` row keeps pointing at it and every
 *              product, variant and search result shows the new name. The slug is
 *              rebuilt with `buildTagSlug` while ignoring the tag being renamed. A
 *              rename onto another tag's name is refused with 400 — tags are never
 *              silently merged. A successful rename writes an UPDATE / `TAG` audit
 *              entry.
 *
 * @param {NextRequest} req - The incoming HTTP request with a JSON body
 * @param {Object} context - Next.js route context
 * @param {Promise<{ tagId: string }>} context.params - Route parameters
 *        (`(await context.params).tagId`, min 2 chars)
 *
 * @body {string} name - New tag name (1–100 characters, trimmed, inner whitespace collapsed)
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - message: "Tag renamed"
 *   - tag: `{ id, name, slug }`
 *
 * @throws {400} "Invalid tag" or validation failed - Reference shorter than 2 chars, blank name, name over 100 chars, or a name already used by another tag
 * @throws {401} Unauthorized - No session, role below manager, or session without a user id
 * @throws {403} Forbidden - Account not active or no role assigned
 * @throws {404} "Tag not found" - No `global_tags` row with that id
 * @throws {500} "Could not rename the tag" - Database failure
 *
 * @description Workflow:
 *   1. Initialize the manager guard and read the manager id, returning 401 when missing
 *   2. Await `context.params` and reject a reference shorter than 2 characters
 *   3. Parse the JSON body and validate it with `tagUpdateSchema`
 *   4. Normalize the name with `normalizeTagName`
 *   5. Initialize the database pool and take a connection
 *   6. Load the tag by id, returning 404 when missing
 *   7. Refuse the rename when another tag already uses the name
 *   8. Rebuild a unique slug while ignoring this tag
 *   9. Update `global_tags` (`name`, `slug`, `updated_by`, `updated_at`)
 *   10. Write an UPDATE / `TAG` audit entry, swallowing audit errors
 *   11. Return 200 response with the renamed tag
 *   12. Release the connection in `finally`
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ tagId: string }> },
) {
  const guard = await requireManager({
    label: "PUT /api/manager/product-studio/tags/[tagId]",
  });
  if (!guard.ok) return guard.response;

  const managerId = guard.session.user.id;
  if (!managerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tagId } = await params;
  if (!tagId || tagId.length < 2) {
    return NextResponse.json({ error: "Invalid tag" }, { status: 400 });
  }

  const json = await req.json().catch(() => null);
  const parsed = tagUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return invalidInput(parsed.error.flatten().fieldErrors);
  }

  const name = normalizeTagName(parsed.data.name);
  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const [existing] = await conn.query<TagRow[]>(
      `SELECT id, name, slug FROM global_tags WHERE id = ? LIMIT 1`,
      [tagId],
    );
    if (!existing[0]) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    /* Never silently merge two tags: a rename onto an existing name is a 409. */
    const [collision] = await conn.query<TagRow[]>(
      `SELECT id FROM global_tags WHERE name = ? AND id <> ? LIMIT 1`,
      [name, tagId],
    );
    if (collision[0]) {
      return invalidInput({
        name: ["Another tag already uses this name"],
      });
    }

    const now = getCurrentDateTime();
    const slug = await buildTagSlug(conn, name, tagId);

    await conn.query(
      `UPDATE global_tags
          SET name = ?, slug = ?, updated_by = ?, updated_at = ?
        WHERE id = ?`,
      [name, slug, managerId, now, tagId],
    );

    try {
      await auditLog.log(pool, {
        userId: managerId,
        action: "UPDATE",
        entityType: "TAG",
        entityId: tagId,
        description: `Global tag renamed. [id=${tagId}, ${existing[0].name} → ${name}, slug=${slug}]`,
      });
    } catch {
      /* audit must never break the response */
    }

    return NextResponse.json({
      ok: true,
      message: "Tag renamed",
      tag: { id: tagId, name, slug },
    });
  } catch (err) {
    console.error("[TAGS - PUT]", err);
    return NextResponse.json(
      { error: "Could not rename the tag" },
      { status: 500 },
    );
  } finally {
    conn.release();
  }
}

/**
 * Deletes an unused global tag for the given `tagId`.
 *
 * @async
 * @function DELETE
 * @description Manager-only delete of one `global_tags` row. The tag is counted in
 *              both mapping tables first; while any product or variant still uses it
 *              the request is refused with 409 and the message carries both counts.
 *              An unused tag is deleted outright and the removal writes a DELETE /
 *              `TAG` audit entry.
 *
 * @param {NextRequest} _req - The incoming HTTP request (unused)
 * @param {Object} context - Next.js route context
 * @param {Promise<{ tagId: string }>} context.params - Route parameters
 *        (`(await context.params).tagId`, min 2 chars)
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - ok: `true`
 *   - message: "Tag deleted"
 *   - deletedId: the removed tag id
 *
 * @throws {400} "Invalid tag" - Reference shorter than 2 characters
 * @throws {401} Unauthorized - No session, role below manager, or session without a user id
 * @throws {403} Forbidden - Account not active or no role assigned
 * @throws {404} "Tag not found" - No `global_tags` row with that id
 * @throws {409} The tag is still used - message names the product and variant counts
 * @throws {500} "Could not delete the tag" - Database failure
 *
 * @description Workflow:
 *   1. Initialize the manager guard and read the manager id, returning 401 when missing
 *   2. Await `context.params` and reject a reference shorter than 2 characters
 *   3. Initialize the database pool and take a connection
 *   4. Load the tag by id, returning 404 when missing
 *   5. Count its rows in `product_tag_mappings` and `product_variant_tag_mappings`
 *   6. Refuse with 409 and both counts when the tag is in use
 *   7. Delete the `global_tags` row
 *   8. Write a DELETE / `TAG` audit entry, swallowing audit errors
 *   9. Return 200 response with `deletedId`
 *   10. Release the connection in `finally`
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ tagId: string }> },
) {
  const guard = await requireManager({
    label: "DELETE /api/manager/product-studio/tags/[tagId]",
  });
  if (!guard.ok) return guard.response;

  const managerId = guard.session.user.id;
  if (!managerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tagId } = await params;
  if (!tagId || tagId.length < 2) {
    return NextResponse.json({ error: "Invalid tag" }, { status: 400 });
  }

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    const [existing] = await conn.query<TagRow[]>(
      `SELECT id, name, slug FROM global_tags WHERE id = ? LIMIT 1`,
      [tagId],
    );
    if (!existing[0]) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    const [usageRows] = await conn.query<UsageRow[]>(
      `SELECT (SELECT COUNT(*) FROM product_tag_mappings
                WHERE tag_id = ?) AS product_count,
              (SELECT COUNT(*) FROM product_variant_tag_mappings
                WHERE tag_id = ?) AS variant_count`,
      [tagId, tagId],
    );
    const productCount = Number(usageRows[0]?.product_count ?? 0);
    const variantCount = Number(usageRows[0]?.variant_count ?? 0);

    if (productCount + variantCount > 0) {
      return NextResponse.json(
        {
          error: `"${existing[0].name}" is used by ${productCount} product${
            productCount === 1 ? "" : "s"
          } and ${variantCount} variant${
            variantCount === 1 ? "" : "s"
          } and cannot be deleted.`,
        },
        { status: 409 },
      );
    }

    await conn.query(`DELETE FROM global_tags WHERE id = ?`, [tagId]);

    try {
      await auditLog.log(pool, {
        userId: managerId,
        action: "DELETE",
        entityType: "TAG",
        entityId: tagId,
        description: `Unused global tag deleted. [id=${tagId}, name=${existing[0].name}, slug=${existing[0].slug}]`,
      });
    } catch {
      /* audit must never break the response */
    }

    return NextResponse.json({
      ok: true,
      message: "Tag deleted",
      deletedId: tagId,
    });
  } catch (err) {
    console.error("[TAGS - DELETE]", err);
    return NextResponse.json(
      { error: "Could not delete the tag" },
      { status: 500 },
    );
  } finally {
    conn.release();
  }
}
