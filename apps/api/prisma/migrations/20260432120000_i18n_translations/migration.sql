-- i18n: locale support for SiteConfig + page translations.
-- Additive. No existing data touched.

-- SiteConfig locale fields
ALTER TABLE "site_configs" ADD COLUMN "locales" TEXT[] DEFAULT '{}';
ALTER TABLE "site_configs" ADD COLUMN "default_locale" VARCHAR(10);

-- Page translations
CREATE TABLE "tenant_page_translations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body_markdown" TEXT NOT NULL,
    "blocks" JSONB,
    "seo_title" VARCHAR(200),
    "seo_description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_page_translations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_page_translations_page_id_locale_key"
  ON "tenant_page_translations"("page_id", "locale");

CREATE INDEX "tenant_page_translations_tenant_id_locale_idx"
  ON "tenant_page_translations"("tenant_id", "locale");

ALTER TABLE "tenant_page_translations"
  ADD CONSTRAINT "tenant_page_translations_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_page_translations"
  ADD CONSTRAINT "tenant_page_translations_page_id_fkey"
  FOREIGN KEY ("page_id") REFERENCES "tenant_pages"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
