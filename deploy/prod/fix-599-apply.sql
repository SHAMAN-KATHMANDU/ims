-- ============================================================================
-- Issue #599 — APPLY: delete orphaned product variation attributes
--
-- Runs in a single transaction: prints the before-count, deletes the orphan
-- rows (same predicate as fix-599-diagnose.sql), prints how many were removed,
-- then COMMITs. If anything errors, the whole thing rolls back.
--
-- PRE-FLIGHT (do these first):
--   1. ./backup-db.sh                                   # take a fresh backup
--   2. Review fix-599-diagnose.sql output               # know what you delete
--
-- Run on the prod host (-1 wraps the file in one transaction; ON_ERROR_STOP
-- makes any failure abort + roll back):
--   docker compose exec -T prod_db psql -U "$POSTGRES_USER" -d ims \
--     -v ON_ERROR_STOP=1 -1 -f - < deploy/prod/fix-599-apply.sql
--
-- Safe to re-run: once clean, it deletes 0 rows.
-- ============================================================================

\set ON_ERROR_STOP on

\echo '== Orphan rows BEFORE delete =='
SELECT count(*) AS orphan_rows_before
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

\echo '== Deleting orphan rows =='
WITH deleted AS (
  DELETE FROM product_variation_attributes pva
  USING product_variations pv
  WHERE pva.variation_id = pv.variation_id
    AND EXISTS (
          SELECT 1 FROM product_attribute_types pat
          WHERE pat.product_id = pv.product_id
        )
    AND NOT EXISTS (
          SELECT 1 FROM product_attribute_types pat2
          WHERE pat2.product_id = pv.product_id
            AND pat2.attribute_type_id = pva.attribute_type_id
        )
  RETURNING 1
)
SELECT count(*) AS rows_deleted FROM deleted;
