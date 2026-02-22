-- Add canonical product location mapping (nullable for safe rollout).
ALTER TABLE "products"
  ADD COLUMN "location_id" TEXT;

CREATE INDEX "products_tenant_id_location_id_idx" ON "products"("tenant_id", "location_id");

ALTER TABLE "products"
  ADD CONSTRAINT "products_location_id_fkey"
  FOREIGN KEY ("location_id") REFERENCES "locations"("location_id") ON DELETE RESTRICT ON UPDATE CASCADE;
