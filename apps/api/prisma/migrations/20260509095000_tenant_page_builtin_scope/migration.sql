-- Add Phase 5 scope page support to TenantPage
-- Built-in scope pages are created when a template is applied.

ALTER TABLE "tenant_pages"
  ADD COLUMN "is_built_in_scope" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "kind" VARCHAR(20) NOT NULL DEFAULT 'page',
  ADD COLUMN "scope" VARCHAR(40);

-- Partial unique constraint: (tenantId, scope) is unique when kind = 'scope'
CREATE UNIQUE INDEX "tenant_page_scope_unique" ON "tenant_pages"("tenant_id", "scope") WHERE "kind" = 'scope';

-- Index for efficient scope page lookups and listPages query ordering
CREATE INDEX "tenant_page_kind_scope_idx" ON "tenant_pages"("tenant_id", "kind", "scope");
