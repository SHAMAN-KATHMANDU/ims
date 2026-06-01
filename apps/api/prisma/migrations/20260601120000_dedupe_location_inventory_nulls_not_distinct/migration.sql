-- Transfers "Add Multiple Products" listed the same variation more than once
-- because duplicate location_inventory rows existed for products without
-- sub-variations. The unique index on (location_id, variation_id,
-- sub_variation_id) used the Postgres default of NULLS DISTINCT, so it never
-- prevented duplicate rows when sub_variation_id IS NULL.
--
-- This migration (1) merges existing duplicate rows by summing their quantities
-- into the oldest survivor row and deleting the rest, then (2) recreates the
-- unique index with NULLS NOT DISTINCT so a NULL sub_variation_id can no longer
-- bypass it. (Prisma 5.22 cannot express NULLS NOT DISTINCT in schema.prisma,
-- so the index is managed here as raw SQL while @@unique keeps the same name.)

-- 1. Merge duplicates -------------------------------------------------------
-- GROUP BY treats NULLs as a single group (unlike the unique index), so this
-- correctly collapses the null-sub-variation duplicates onto one survivor.
CREATE TEMP TABLE "_li_dedupe" AS
SELECT
  "location_id",
  "variation_id",
  "sub_variation_id",
  (ARRAY_AGG("inventory_id" ORDER BY "created_at" ASC, "inventory_id" ASC))[1] AS keep_id,
  SUM("quantity")::int AS total_quantity
FROM "location_inventory"
GROUP BY "location_id", "variation_id", "sub_variation_id"
HAVING COUNT(*) > 1;

-- Sum the duplicate quantities into the survivor row.
UPDATE "location_inventory" li
SET "quantity" = d.total_quantity,
    "updated_at" = now()
FROM "_li_dedupe" d
WHERE li."inventory_id" = d.keep_id;

-- Remove the non-survivor duplicate rows.
DELETE FROM "location_inventory" li
USING "_li_dedupe" d
WHERE li."location_id" = d."location_id"
  AND li."variation_id" = d."variation_id"
  AND li."sub_variation_id" IS NOT DISTINCT FROM d."sub_variation_id"
  AND li."inventory_id" <> d.keep_id;

DROP TABLE "_li_dedupe";

-- 2. Recreate the unique index with NULLS NOT DISTINCT ----------------------
DROP INDEX "location_inventory_location_id_variation_id_sub_variation_i_key";
CREATE UNIQUE INDEX "location_inventory_location_id_variation_id_sub_variation_i_key"
  ON "location_inventory" ("location_id", "variation_id", "sub_variation_id") NULLS NOT DISTINCT;
