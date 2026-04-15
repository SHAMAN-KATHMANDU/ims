-- =====================================================================
-- Phase 1 — site_layouts + nav_menus (block-based template foundation)
-- =====================================================================
-- Adds two new tables:
--   1. site_layouts — one row per (tenant, scope, page_id). Stores a JSON
--      block tree (published + optional draft). Scopes are stable strings:
--      "header" | "footer" | "home" | "products-index" | "product-detail"
--      | "blog-index" | "blog-post" | "page" (page_id required).
--   2. nav_menus — one row per (tenant, slot). Stores a JSON NavItem[]
--      for header / footer / mobile-drawer nav configuration.
--
-- Both tables are additive and tenant-site reads fall back to the legacy
-- rendering path when no row exists, so this migration ships with zero
-- user-visible change.

CREATE TABLE "site_layouts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "scope" VARCHAR(40) NOT NULL,
    "page_id" TEXT,
    "blocks" JSONB NOT NULL,
    "draft_blocks" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_layouts_pkey" PRIMARY KEY ("id")
);

-- Unique: at most one layout per (tenant, scope, page_id). Postgres treats
-- NULL as distinct in unique indexes, so non-page scopes (page_id IS NULL)
-- coexist with many per-page overrides.
CREATE UNIQUE INDEX "site_layouts_tenant_id_scope_page_id_key"
  ON "site_layouts"("tenant_id", "scope", "page_id");

CREATE INDEX "site_layouts_tenant_id_idx"
  ON "site_layouts"("tenant_id");

ALTER TABLE "site_layouts"
  ADD CONSTRAINT "site_layouts_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "site_layouts"
  ADD CONSTRAINT "site_layouts_page_id_fkey"
  FOREIGN KEY ("page_id") REFERENCES "tenant_pages"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;


CREATE TABLE "nav_menus" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "slot" VARCHAR(40) NOT NULL,
    "items" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nav_menus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nav_menus_tenant_id_slot_key"
  ON "nav_menus"("tenant_id", "slot");

ALTER TABLE "nav_menus"
  ADD CONSTRAINT "nav_menus_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
