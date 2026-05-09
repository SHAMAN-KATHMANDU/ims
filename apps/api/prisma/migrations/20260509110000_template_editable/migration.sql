-- AddColumn for Phase 8: Templates as Data + Forks
-- Add support for editable template layouts, theme tokens, and per-tenant forking

-- Add new columns to SiteTemplate for editable layouts and theme tokens
ALTER TABLE "site_templates" ADD COLUMN "default_layouts" JSONB;
ALTER TABLE "site_templates" ADD COLUMN "default_theme_tokens" JSONB;

-- Add fork/ownership columns to support per-tenant template forks
ALTER TABLE "site_templates" ADD COLUMN "parent_template_id" TEXT;
ALTER TABLE "site_templates" ADD COLUMN "owner_tenant_id" TEXT;
ALTER TABLE "site_templates" ADD COLUMN "is_public" BOOLEAN NOT NULL DEFAULT true;

-- Add indexes for fork queries and tenant-specific templates
CREATE INDEX "site_templates_owner_tenant_id_idx" ON "site_templates"("owner_tenant_id");
CREATE INDEX "site_templates_parent_template_id_idx" ON "site_templates"("parent_template_id");

-- Add foreign key for parent template self-reference
ALTER TABLE "site_templates" ADD CONSTRAINT "site_templates_parent_template_id_fkey"
  FOREIGN KEY ("parent_template_id") REFERENCES "site_templates"("id") ON DELETE SET NULL;

-- Add foreign key for owner tenant
ALTER TABLE "site_templates" ADD CONSTRAINT "site_templates_owner_tenant_id_fkey"
  FOREIGN KEY ("owner_tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
