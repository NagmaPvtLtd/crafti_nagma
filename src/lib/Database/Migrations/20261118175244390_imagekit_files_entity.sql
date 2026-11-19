-- Product Studio — variant image ownership on imagekit_files
-- ===========================================================
-- imagekit_files is the central file store and is polymorphic: every file
-- row already carries file_purpose, and the new entity columns let us point
-- at the exact product + variant while keeping it one table.
--
--   file_purpose       → 'product_variant_image'  (variants only)
--   entity_type        → 'product_variant'
--   entity_id          → product_variants.id
--
-- No extra join tables are created: a base product has no images at all.
ALTER TABLE imagekit_files
ADD COLUMN entity_type VARCHAR(50) NOT NULL DEFAULT 'product_variant' FIRST,
  ADD COLUMN entity_id CHAR(40) NOT NULL DEFAULT ''
AFTER entity_type;
ALTER TABLE imagekit_files
ADD CONSTRAINT chk_imagekit_files_entity_type CHECK (
    entity_type = 'product_variant'
    OR entity_type = 'product'
  );
ALTER TABLE imagekit_files
ADD CONSTRAINT chk_imagekit_files_file_purpose_variant CHECK (
    (file_purpose IS NULL)
    OR (
      file_purpose = 'product_variant_image'
      AND entity_type = 'product_variant'
      AND entity_id <> ''
    )
  );