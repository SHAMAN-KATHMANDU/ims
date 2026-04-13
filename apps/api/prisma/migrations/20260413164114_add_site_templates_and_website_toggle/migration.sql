-- CreateEnum
CREATE TYPE "SiteTemplateTier" AS ENUM ('MINIMAL', 'STANDARD', 'LUXURY', 'BOUTIQUE');

-- AlterTable
ALTER TABLE "site_configs" ADD COLUMN     "template_id" TEXT,
ADD COLUMN     "website_enabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "site_templates" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tier" "SiteTemplateTier" NOT NULL DEFAULT 'STANDARD',
    "preview_image_url" TEXT,
    "default_branding" JSONB,
    "default_sections" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "site_templates_slug_key" ON "site_templates"("slug");

-- CreateIndex
CREATE INDEX "site_templates_is_active_sort_order_idx" ON "site_templates"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "site_configs_template_id_idx" ON "site_configs"("template_id");

-- AddForeignKey
ALTER TABLE "site_configs" ADD CONSTRAINT "site_configs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "site_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
