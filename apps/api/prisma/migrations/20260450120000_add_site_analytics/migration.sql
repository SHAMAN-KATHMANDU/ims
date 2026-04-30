-- AddColumn: analytics Json? on site_configs
-- IF NOT EXISTS for idempotency in case a prior session already applied this.
ALTER TABLE "site_configs" ADD COLUMN IF NOT EXISTS "analytics" JSONB;
