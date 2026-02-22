-- Backfill products.location_id in a deterministic and tenant-safe order.
-- Priority:
--  1) Tenant default active warehouse
--  2) First active inventory location already linked to the product
--  3) Fail loudly if anything remains unresolved

-- 1) Use tenant default active warehouse when available.
UPDATE "products" p
SET "location_id" = l."location_id"
FROM "locations" l
WHERE p."location_id" IS NULL
  AND l."tenant_id" = p."tenant_id"
  AND l."is_active" = true
  AND l."type" = 'WAREHOUSE'
  AND l."is_default_warehouse" = true;

-- 2) Fallback: first active location seen in existing product inventory mappings.
WITH product_inventory_location AS (
  SELECT
    p."product_id",
    MIN(li."location_id") AS "location_id"
  FROM "products" p
  JOIN "product_variations" pv
    ON pv."product_id" = p."product_id"
  JOIN "location_inventory" li
    ON li."variation_id" = pv."variation_id"
  JOIN "locations" l
    ON l."location_id" = li."location_id"
  WHERE p."location_id" IS NULL
    AND l."is_active" = true
    AND l."tenant_id" = p."tenant_id"
  GROUP BY p."product_id"
)
UPDATE "products" p
SET "location_id" = pil."location_id"
FROM product_inventory_location pil
WHERE p."product_id" = pil."product_id"
  AND p."location_id" IS NULL;

-- 3) Guardrail: fail migration if unresolved rows remain.
DO $$
DECLARE
  unresolved_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unresolved_count
  FROM "products"
  WHERE "location_id" IS NULL;

  RAISE NOTICE 'Precheck: unresolved products.location_id rows = %', unresolved_count;

  IF unresolved_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce required products.location_id; unresolved rows remain (%). Ensure each tenant has a default active warehouse or product inventory mapping.', unresolved_count;
  END IF;
END $$;
