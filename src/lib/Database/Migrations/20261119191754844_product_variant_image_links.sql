-- Product Studio — shallow image links
-- ===========================================================
-- An uploaded image lives on the variant it was uploaded to:
--   source_image_id IS NULL  + file_id set   → the original upload
--   source_image_id set      + file_id NULL  → a link row owned by another
--                                              variant, pointing at the original
--
-- ImageKit stores the file exactly once. Linking only adds the tiny row, and
-- links are one hop deep because the picker only offers `source_image_id IS
-- NULL` rows. No join table is created; imagekit_files stays the single
-- polymorphic file store.
ALTER TABLE imagekit_files
  MODIFY COLUMN file_id VARCHAR(255) DEFAULT NULL,
  ADD COLUMN source_image_id CHAR(40) DEFAULT NULL AFTER entity_id,
  ADD UNIQUE KEY uq_imagekit_files_link (source_image_id, entity_id),
  ADD KEY idx_imagekit_files_source (source_image_id),
  ADD CONSTRAINT fk_imagekit_files_source FOREIGN KEY (source_image_id)
    REFERENCES imagekit_files(id) ON DELETE CASCADE,
  ADD CONSTRAINT chk_imagekit_files_origin CHECK (
    (source_image_id IS NULL AND file_id IS NOT NULL)
    OR (source_image_id IS NOT NULL AND file_id IS NULL)
  );
