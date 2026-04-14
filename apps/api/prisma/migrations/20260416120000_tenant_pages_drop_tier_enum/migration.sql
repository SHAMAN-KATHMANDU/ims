-- =====================================================================
-- Phase C.1 — tenant custom pages, template category, drop tier enum
-- =====================================================================
-- This migration makes three schema changes:
--   1. Rename `site_templates.tier` (enum) → `category` (VARCHAR(40)).
--      Lowercases the existing enum values in-place so the template picker
--      can group without a hard-coded enum.
--   2. Adds `site_templates.default_pages` JSONB for per-template page
--      visibility defaults (home / products / blog / contact / custom).
--   3. Creates the `tenant_pages` table for tenant-authored static pages
--      (About, FAQ, Shipping, Lookbook, etc.).
--
-- Safe to run — the data migration for the category column happens before
-- the old enum type is dropped, and no existing data is removed.

-- 1a. Add the new `category` column to site_templates.
ALTER TABLE "site_templates" ADD COLUMN "category" VARCHAR(40);

-- 1b. Backfill from the existing enum column (lowercase).
UPDATE "site_templates" SET "category" = LOWER("tier"::text);

-- 1c. Drop the old enum column and its type.
ALTER TABLE "site_templates" DROP COLUMN "tier";
DROP TYPE "SiteTemplateTier";

-- 1d. Index on the new category column.
CREATE INDEX "site_templates_category_idx" ON "site_templates"("category");

-- 2. Add default_pages JSONB column.
ALTER TABLE "site_templates" ADD COLUMN "default_pages" JSONB;

-- 3. Create tenant_pages table.
CREATE TABLE "tenant_pages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body_markdown" TEXT NOT NULL,
    "layout_variant" VARCHAR(40) NOT NULL DEFAULT 'default',
    "show_in_nav" BOOLEAN NOT NULL DEFAULT true,
    "nav_order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "seo_title" VARCHAR(200),
    "seo_description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_pages_pkey" PRIMARY KEY ("id")
);

-- Uniqueness: two pages cannot share the same slug within a tenant.
CREATE UNIQUE INDEX "tenant_pages_tenant_id_slug_key" ON "tenant_pages"("tenant_id", "slug");

-- Nav lookup index: fetching only published pages in nav order for the
-- tenant-site header is a hot path.
CREATE INDEX "tenant_pages_tenant_id_is_published_nav_order_idx"
  ON "tenant_pages"("tenant_id", "is_published", "nav_order");

ALTER TABLE "tenant_pages"
  ADD CONSTRAINT "tenant_pages_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
