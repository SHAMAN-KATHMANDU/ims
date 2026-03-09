-- Move identifier from product-level (ims_code) to variation-level only.
-- Variation column sku is renamed to ims_code and made required; product.ims_code is dropped.

-- 1. Rename product_variations.sku -> ims_code
ALTER TABLE "product_variations" RENAME COLUMN "sku" TO "ims_code";

-- 2. Backfill any NULL ims_code with variation_id (unique)
UPDATE "product_variations" SET "ims_code" = "variation_id" WHERE "ims_code" IS NULL;

-- 3. Make ims_code required
ALTER TABLE "product_variations" ALTER COLUMN "ims_code" SET NOT NULL;

-- 4. Replace unique index (tenant_id, sku) with (tenant_id, ims_code)
DROP INDEX IF EXISTS "product_variations_tenant_id_sku_key";
CREATE UNIQUE INDEX "product_variations_tenant_id_ims_code_key" ON "product_variations"("tenant_id", "ims_code");

-- 5. Drop product-level ims_code and its unique constraint
DROP INDEX IF EXISTS "products_tenant_id_ims_code_key";
ALTER TABLE "products" DROP COLUMN IF EXISTS "ims_code";
