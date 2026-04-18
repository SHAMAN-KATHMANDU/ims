-- Gap #5: tenant-configurable storefront currency.
-- Additive, non-breaking. Existing rows default to "NPR" which is the
-- pre-existing hard-coded price formatter assumption.

ALTER TABLE "site_configs"
  ADD COLUMN "currency" VARCHAR(8) NOT NULL DEFAULT 'NPR';
