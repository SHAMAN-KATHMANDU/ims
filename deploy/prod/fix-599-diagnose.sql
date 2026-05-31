-- ============================================================================
-- Issue #599 — DIAGNOSE orphaned product variation attributes (READ-ONLY)
--
-- Symptom: variant names on the products table show historical / duplicate
-- values (e.g. "Grey / M / M / Black" instead of "M / Black").
--
-- Cause: when an attribute type was deselected — or re-created after renaming
-- a product — each variation kept its old attribute row. Every
-- (variation, attribute_type) pair is a distinct row, so those orphans
-- survived the save and the variant-name builder joined them all.
--
-- An "orphan" is a product_variation_attributes row whose attribute_type is
-- NOT one of the product's currently-selected types (product_attribute_types).
-- We only flag rows for products that declare at least one attribute type, so
-- legacy products that carry attributes without tracked product-level types
-- are left alone (mirrors the app-layer guard added with the #599 fix).
--
-- This script makes NO changes. Run it first, eyeball the rows, then run
-- fix-599-apply.sql to remove them.
--
-- Run on the prod host:
--   docker compose exec -T prod_db psql -U "$POSTGRES_USER" -d ims \
--     -f - < deploy/prod/fix-599-diagnose.sql
-- (or copy the file in and use -f deploy/prod/fix-599-diagnose.sql)
-- ============================================================================

\echo '== Orphan variation-attribute rows (would be deleted by fix-599-apply.sql) =='
SELECT
  pv.tenant_id,
  p.product_name      AS product_name,
  pva.variation_id,
  at.name             AS orphan_type,
  av.value            AS orphan_value
FROM product_variation_attributes pva
JOIN product_variations pv  ON pv.variation_id = pva.variation_id
JOIN products p             ON p.product_id = pv.product_id
LEFT JOIN attribute_types at  ON at.attribute_type_id = pva.attribute_type_id
LEFT JOIN attribute_values av ON av.attribute_value_id = pva.attribute_value_id
WHERE EXISTS (
        SELECT 1 FROM product_attribute_types pat
        WHERE pat.product_id = pv.product_id
      )
  AND NOT EXISTS (
        SELECT 1 FROM product_attribute_types pat2
        WHERE pat2.product_id = pv.product_id
          AND pat2.attribute_type_id = pva.attribute_type_id
      )
ORDER BY pv.tenant_id, p.product_name, pva.variation_id;

\echo '== Orphan totals (rows / distinct variations / distinct products) =='
SELECT
  count(*)                       AS orphan_rows,
  count(DISTINCT pva.variation_id) AS affected_variations,
  count(DISTINCT pv.product_id)    AS affected_products
FROM product_variation_attributes pva
JOIN product_variations pv ON pv.variation_id = pva.variation_id
WHERE EXISTS (
        SELECT 1 FROM product_attribute_types pat
        WHERE pat.product_id = pv.product_id
      )
  AND NOT EXISTS (
        SELECT 1 FROM product_attribute_types pat2
        WHERE pat2.product_id = pv.product_id
          AND pat2.attribute_type_id = pva.attribute_type_id
      );
