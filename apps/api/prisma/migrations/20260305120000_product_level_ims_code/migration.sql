-- Move IMS code from variation level to product level.
-- 1. Add products.ims_code (nullable)
-- 2. Backfill from first variation per product (by created_at)
-- 3. Fill any remaining nulls with product_id, then set NOT NULL
-- 4. Add unique constraint on (tenant_id, ims_code)
-- 5. Drop product_variations.ims_code and its unique constraint

-- Step 1: Add product-level ims_code (nullable)
ALTER TABLE "products" ADD COLUMN "ims_code" VARCHAR(100);

-- Step 2: Backfill from first variation per product (deterministic: first by created_at)
UPDATE "products" p
SET "ims_code" = (
  SELECT pv.ims_code
  FROM "product_variations" pv
  WHERE pv.product_id = p.product_id
  ORDER BY pv.created_at ASC
  LIMIT 1
);

-- Step 3: Sentinel for any products with no variations (should be rare)
UPDATE "products" SET "ims_code" = "product_id" WHERE "ims_code" IS NULL;

-- Handle duplicate ims_code across products (same tenant): keep first product, others get product_id
WITH ranked AS (
  SELECT product_id, ims_code,
         ROW_NUMBER() OVER (PARTITION BY tenant_id, ims_code ORDER BY date_created ASC) AS rn
  FROM "products"
)
UPDATE "products" p
SET ims_code = p.product_id
FROM ranked r
WHERE p.product_id = r.product_id AND r.rn > 1;

ALTER TABLE "products" ALTER COLUMN "ims_code" SET NOT NULL;

-- Step 4: Unique constraint on (tenant_id, ims_code)
CREATE UNIQUE INDEX "products_tenant_id_ims_code_key" ON "products"("tenant_id", "ims_code");

-- Step 5: Drop variation-level ims_code
DROP INDEX IF EXISTS "product_variations_tenant_id_ims_code_key";
ALTER TABLE "product_variations" DROP COLUMN "ims_code";
