-- Add altText and folder columns to media_assets
ALTER TABLE "media_assets" ADD COLUMN "alt_text" TEXT;
ALTER TABLE "media_assets" ADD COLUMN "folder" VARCHAR(80);

-- Create index on (tenant_id, folder) for efficient folder filtering
CREATE INDEX "media_assets_tenant_id_folder_idx" ON "media_assets"("tenant_id", "folder");
