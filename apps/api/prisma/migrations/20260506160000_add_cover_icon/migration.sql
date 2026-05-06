-- Phase 8 — Notion-style page-top customization.
-- Both columns are nullable so existing rows render with clean default
-- chrome; tenants opt in by setting them on the editor.

ALTER TABLE "blog_posts"
  ADD COLUMN "cover_image_url" VARCHAR(1000),
  ADD COLUMN "icon" VARCHAR(80);

ALTER TABLE "tenant_pages"
  ADD COLUMN "cover_image_url" VARCHAR(1000),
  ADD COLUMN "icon" VARCHAR(80);
