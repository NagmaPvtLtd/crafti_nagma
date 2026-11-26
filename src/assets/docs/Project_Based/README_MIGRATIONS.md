# Migrations — keep them simple and TiDB-safe

Read this before writing any file in `src/lib/Database/Migrations/`.

Production runs on **TiDB Cloud**; your machine runs **MySQL**. MySQL accepts SQL
that TiDB rejects, so "it worked locally" proves nothing. The rules below are the
smallest set that has already gone wrong once in production.

---

## How the runner works

- `src/lib/Database/migration.runner.db.ts` runs at boot (`initializeDatabase`).
- It reads every `*.sql` file in `src/lib/Database/Migrations/`, **sorted by
  filename**, and skips the ones already listed in the `migrations` table.
- A file is split on `;` and each statement runs one after another on one
  connection. `-- `, `#` and `/* … */` comments are stripped.
- The filename is recorded **only after the whole file succeeds**. A file that
  fails halfway leaves its earlier statements applied and records nothing, so the
  next boot retries it from the top.
- DDL is auto-committed. Never wrap a migration in `START TRANSACTION`.
- Migrations are **append-only**: never edit a file that has already run (on any
  environment). Fix forward with a new file.

## Naming

`YYYYMMDDHHMMSSmmm_short_snake_name.sql`, same style as the existing files
(`20261126170032282_variant_visibility_and_order_limits.sql`). The prefix sorts
chronologically, which is the only ordering the runner uses.

---

## Golden rules

1. **One change per statement.** A file may hold several statements, but each one
   must stand on its own.
2. **Never reference a column added in the same statement.** TiDB validates the
   whole `ALTER` against the table _as it was before the statement_, so:

   ```sql
   -- FAILS on TiDB with ER_BAD_FIELD_ERROR (1054)
   ALTER TABLE product_variants
     ADD COLUMN hide_stock BOOLEAN NOT NULL DEFAULT FALSE AFTER stock,
     ADD COLUMN min_order_qty INT DEFAULT NULL AFTER hide_stock;
   ```

   Separate statements in the same file are fine, because by the time the second
   one runs the first column exists:

   ```sql
   -- works on MySQL and TiDB
   ALTER TABLE product_variants
   ADD COLUMN hide_stock BOOLEAN NOT NULL DEFAULT FALSE AFTER stock;

   ALTER TABLE product_variants
   ADD COLUMN min_order_qty INT DEFAULT NULL AFTER hide_stock;
   ```

   If positioning is not important, drop `AFTER` altogether and keep one plain
   `ADD COLUMN` per statement. Boring is correct.

3. **Stay inside the shared subset.** Safe: `CREATE TABLE`, `CREATE INDEX`,
   `ALTER TABLE … ADD/DROP COLUMN` (one column per statement), `ALTER TABLE …
ADD INDEX`, `DROP TABLE IF EXISTS`, plain `INSERT/UPDATE`.
   Avoid unless you have verified it on TiDB: stored procedures, functions,
   triggers, events, `ADD/DROP COLUMN IF NOT EXISTS`, `ALGORITHM=`/`LOCK=`
   clauses, generated columns, `AFTER` pointing at a new column, and foreign keys
   in `ALTER`.
4. **Update `src/lib/Database/Dump/LATEST_SCHEMA.sql` in the same change**, so the
   current schema is always readable in one place.
5. **Comments:** `-- ` at the start of the line, no `;` inside a comment.

## Template

```sql
-- ---------------------------------------------------------------------------
-- What this migration changes and why. One line per column is enough.
-- ---------------------------------------------------------------------------

ALTER TABLE product_variants
ADD COLUMN processing_time VARCHAR(100) DEFAULT NULL;
```

## When a migration fails in production

1. The `migrations` table has **no** row for that file, so it will retry on every
   boot. Fix the SQL first; do not leave it failing.
2. Some statements may already be applied. Check before retrying:

   ```sql
   SHOW COLUMNS FROM product_variants LIKE 'processing_time';
   ```

3. For a column this migration had just added (new, empty, unused), drop it and
   restart so the corrected file runs cleanly:

   ```sql
   ALTER TABLE product_variants DROP COLUMN processing_time;
   ```

4. Never insert a `migrations` row by hand to "make it stop" — that hides a
   schema that does not match the code.
