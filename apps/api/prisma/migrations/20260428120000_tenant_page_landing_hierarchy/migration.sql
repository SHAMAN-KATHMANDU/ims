-- Layer 3 — add landing-page flag + parent-child hierarchy to tenant_pages.
-- Additive-only. No existing data is touched.

ALTER TABLE "tenant_pages" ADD COLUMN "is_landing_page" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tenant_pages" ADD COLUMN "parent_id" TEXT;

-- Self-referencing FK for page hierarchy.
ALTER TABLE "tenant_pages"
  ADD CONSTRAINT "tenant_pages_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "tenant_pages"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Index for parent lookups.
CREATE INDEX "tenant_pages_tenant_id_parent_id_idx"
  ON "tenant_pages"("tenant_id", "parent_id");
