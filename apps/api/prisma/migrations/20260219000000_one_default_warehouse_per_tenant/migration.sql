-- Enforce at most one default warehouse per tenant (data integrity for product creation).
-- Product creation requires a default warehouse; this constraint prevents multiple defaults.
CREATE UNIQUE INDEX "locations_one_default_warehouse_per_tenant"
ON "locations" ("tenant_id")
WHERE "is_default_warehouse" = true;
