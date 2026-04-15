-- =====================================================================
-- Phase F — AbandonedCart model for cart-abandoned automation trigger
-- =====================================================================
-- Adds:
--   1. abandoned_carts table — session-keyed cart snapshots pinged from
--      the tenant-site CartProvider
--   2. Unique (tenant_id, session_key)
--   3. Indexes for the sweep query and for the tenant admin view
--
-- No existing data is touched. Safe migration.

CREATE TABLE "abandoned_carts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "session_key" VARCHAR(64) NOT NULL,
    "items" JSONB NOT NULL,
    "subtotal" DECIMAL(12, 2) NOT NULL,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'NPR',
    "customer_name" VARCHAR(200),
    "customer_phone" VARCHAR(40),
    "customer_email" VARCHAR(200),
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "abandoned_carts_pkey" PRIMARY KEY ("id")
);

-- Unique: one row per (tenant, browser session)
CREATE UNIQUE INDEX "abandoned_carts_tenant_id_session_key_key"
  ON "abandoned_carts"("tenant_id", "session_key");

-- Admin view: newest activity first per tenant
CREATE INDEX "abandoned_carts_tenant_id_last_activity_at_idx"
  ON "abandoned_carts"("tenant_id", "last_activity_at");

-- Sweep query: find rows where notified_at IS NULL AND last_activity_at < cutoff.
-- A composite index on (notified_at, last_activity_at) keeps the scheduler
-- cheap even with many stale carts.
CREATE INDEX "abandoned_carts_notified_at_last_activity_at_idx"
  ON "abandoned_carts"("notified_at", "last_activity_at");

-- Foreign key
ALTER TABLE "abandoned_carts"
  ADD CONSTRAINT "abandoned_carts_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
