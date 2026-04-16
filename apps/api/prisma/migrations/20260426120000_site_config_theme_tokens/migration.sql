-- Layer 1 — add SiteConfig.theme_tokens column (nullable JSONB)
-- Additive-only. No existing data is touched. The tenant-site renderer
-- prefers this column over the legacy `branding` JSON when set.

ALTER TABLE "site_configs" ADD COLUMN "theme_tokens" JSONB;
