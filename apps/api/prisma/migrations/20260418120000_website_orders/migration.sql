-- =====================================================================
-- Phase E.1 — WebsiteOrder model for guest checkout from the tenant-site
-- =====================================================================
-- Adds:
--   1. WebsiteOrderStatus enum (PENDING_VERIFICATION / VERIFIED /
--      REJECTED / CONVERTED_TO_SALE)
--   2. website_orders table — guest customer info, items JSONB snapshot,
--      verification + rejection + conversion audit, optional FK to the
--      converted Sale
--
-- No existing data is touched. Safe migration.

-- 1. Status enum
CREATE TYPE "WebsiteOrderStatus" AS ENUM (
  'PENDING_VERIFICATION',
  'VERIFIED',
  'REJECTED',
  'CONVERTED_TO_SALE'
);

-- 2. Table
CREATE TABLE "website_orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_code" VARCHAR(40) NOT NULL,
    "status" "WebsiteOrderStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "customer_name" VARCHAR(200) NOT NULL,
    "customer_phone" VARCHAR(40) NOT NULL,
    "customer_email" VARCHAR(200),
    "customer_note" TEXT,
    "items" JSONB NOT NULL,
    "subtotal" DECIMAL(12, 2) NOT NULL,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'NPR',
    "source_ip" VARCHAR(64),
    "source_user_agent" VARCHAR(500),
    "verified_at" TIMESTAMP(3),
    "verified_by_id" TEXT,
    "rejected_at" TIMESTAMP(3),
    "rejected_by_id" TEXT,
    "rejection_reason" VARCHAR(500),
    "converted_at" TIMESTAMP(3),
    "converted_by_id" TEXT,
    "converted_sale_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_orders_pkey" PRIMARY KEY ("id")
);

-- Unique: one orderCode per tenant
CREATE UNIQUE INDEX "website_orders_tenant_id_order_code_key"
  ON "website_orders"("tenant_id", "order_code");

-- Unique: a converted Sale can only be referenced by one WebsiteOrder
CREATE UNIQUE INDEX "website_orders_converted_sale_id_key"
  ON "website_orders"("converted_sale_id");

-- Hot path: admin listing "Website Orders" sorted newest-first, filtered
-- by status (PENDING_VERIFICATION for the default view)
CREATE INDEX "website_orders_tenant_id_status_created_at_idx"
  ON "website_orders"("tenant_id", "status", "created_at" DESC);

-- Foreign keys
ALTER TABLE "website_orders"
  ADD CONSTRAINT "website_orders_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "website_orders"
  ADD CONSTRAINT "website_orders_verified_by_id_fkey"
  FOREIGN KEY ("verified_by_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "website_orders"
  ADD CONSTRAINT "website_orders_rejected_by_id_fkey"
  FOREIGN KEY ("rejected_by_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "website_orders"
  ADD CONSTRAINT "website_orders_converted_by_id_fkey"
  FOREIGN KEY ("converted_by_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "website_orders"
  ADD CONSTRAINT "website_orders_converted_sale_id_fkey"
  FOREIGN KEY ("converted_sale_id") REFERENCES "sales"("sale_id")
  ON DELETE SET NULL ON UPDATE CASCADE;
