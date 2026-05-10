-- Add offers JSON field to SiteConfig
-- Stores: { id, title, promoCodeIds: string[], ... }[]
--
-- IF NOT EXISTS: schema field shipped in PR #522 without a migration; the dev DB
-- received the column out-of-band before this file existed. Idempotent so dev
-- migrate deploy is a no-op while prod gets the ALTER.

ALTER TABLE "site_configs" ADD COLUMN IF NOT EXISTS "offers" JSONB;
