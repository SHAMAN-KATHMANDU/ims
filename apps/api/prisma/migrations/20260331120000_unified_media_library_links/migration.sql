-- AlterTable
ALTER TABLE "contact_attachments" ADD COLUMN "media_asset_id" TEXT;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN "media_asset_id" TEXT;

-- CreateIndex
CREATE INDEX "contact_attachments_media_asset_id_idx" ON "contact_attachments"("media_asset_id");

-- CreateIndex
CREATE INDEX "messages_media_asset_id_idx" ON "messages"("media_asset_id");

-- AddForeignKey
ALTER TABLE "contact_attachments" ADD CONSTRAINT "contact_attachments_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("media_asset_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("media_asset_id") ON DELETE RESTRICT ON UPDATE CASCADE;
