-- Remove variant tag mappings that duplicate a tag inherited from the base product.
DELETE FROM product_variant_tag_mappings
WHERE EXISTS (
    SELECT 1
    FROM product_variants v
      JOIN product_tag_mappings ptm ON ptm.product_id = v.product_id
    WHERE v.id = product_variant_tag_mappings.variant_id
      AND ptm.tag_id = product_variant_tag_mappings.tag_id
  );