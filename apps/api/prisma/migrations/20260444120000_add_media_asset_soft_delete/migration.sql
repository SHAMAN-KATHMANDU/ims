-- Add soft-delete tombstone to media_assets so deletes preserve recovery
-- and so we can refuse hard-deletes when a SiteLayout block references the asset.
ALTER TABLE "media_assets" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- Tenant-scoped index for list queries that filter on deletedAt.
CREATE INDEX "media_assets_tenant_id_deleted_at_idx" ON "media_assets"("tenant_id", "deleted_at");
