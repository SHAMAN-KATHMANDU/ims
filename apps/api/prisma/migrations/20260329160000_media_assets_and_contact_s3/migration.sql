-- CreateTable
CREATE TABLE "media_assets" (
    "media_asset_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "storage_key" VARCHAR(768) NOT NULL,
    "public_url" VARCHAR(1024) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(120) NOT NULL,
    "byte_size" INTEGER,
    "purpose" VARCHAR(64) NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("media_asset_id")
);

-- AlterTable
ALTER TABLE "contact_attachments" ADD COLUMN "storage_key" VARCHAR(768),
ADD COLUMN "public_url" VARCHAR(1024);

-- CreateIndex
CREATE INDEX "media_assets_tenant_id_created_at_idx" ON "media_assets"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_tenant_id_storage_key_key" ON "media_assets"("tenant_id", "storage_key");

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
