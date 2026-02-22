-- Enforce canonical product location mapping after backfill.
ALTER TABLE "products"
  ALTER COLUMN "location_id" SET NOT NULL;
