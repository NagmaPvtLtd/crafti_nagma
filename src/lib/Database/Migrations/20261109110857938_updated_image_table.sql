ALTER TABLE imagekit_files
    DROP COLUMN entity_type,
    DROP COLUMN file_size,
    DROP COLUMN file_type,
    DROP COLUMN width,
    DROP COLUMN height,
    DROP COLUMN tags,
    MODIFY COLUMN file_purpose ENUM(
        'product_variant_image',
        'category_thumbnail',
        'discount_picture'
    ) DEFAULT NULL;