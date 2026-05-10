-- Backfill legacy schema-vs-migrations drift discovered via
-- `prisma migrate diff --from-url <dev-db> --to-schema-datamodel schema.prisma`.
--
-- Every block is idempotent (existence checks + duplicate_object handlers) so
-- this migration is safe to apply against any environment regardless of which
-- subset of the drift it currently has.

-- ---------------------------------------------------------------------------
-- 1. CREATE tenant_api_keys (TenantApiKey model added in PR #461 without a migration)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "tenant_api_keys" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "tenant_domain_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "hash" TEXT NOT NULL,
  "last4" TEXT NOT NULL,
  "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "rate_limit_per_min" INTEGER NOT NULL DEFAULT 120,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_used_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  CONSTRAINT "tenant_api_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tenant_api_keys_prefix_key"            ON "tenant_api_keys"("prefix");
CREATE INDEX        IF NOT EXISTS "tenant_api_keys_tenant_id_idx"         ON "tenant_api_keys"("tenant_id");
CREATE INDEX        IF NOT EXISTS "tenant_api_keys_tenant_domain_id_idx"  ON "tenant_api_keys"("tenant_domain_id");

DO $$ BEGIN
  ALTER TABLE "tenant_api_keys" ADD CONSTRAINT "tenant_api_keys_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "tenant_api_keys" ADD CONSTRAINT "tenant_api_keys_tenant_domain_id_fkey"
    FOREIGN KEY ("tenant_domain_id") REFERENCES "tenant_domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 2. forms.submit_to → forms.submitTo (PR #509 dropped the @map without a migration)
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forms' AND column_name = 'submit_to'
  ) THEN
    ALTER TABLE "forms" RENAME COLUMN "submit_to" TO "submitTo";
  END IF;
END $$;

ALTER TABLE "forms"
  ADD COLUMN IF NOT EXISTS "submitTo" VARCHAR(20) NOT NULL DEFAULT 'email';

-- ---------------------------------------------------------------------------
-- 3. Forms / form_submissions type widening (VARCHAR → TEXT, TIMESTAMP precision).
--    Schema dropped @db.VarChar annotations; data is binary-compatible so this
--    is a metadata-only change in Postgres (no table rewrite). Idempotent
--    because re-altering TEXT to TEXT is a no-op.
-- ---------------------------------------------------------------------------

ALTER TABLE "forms"
  ALTER COLUMN "id"        TYPE TEXT,
  ALTER COLUMN "tenant_id" TYPE TEXT,
  ALTER COLUMN "name"      TYPE TEXT,
  ALTER COLUMN "slug"      TYPE TEXT;

ALTER TABLE "form_submissions"
  ALTER COLUMN "form_id"      TYPE TEXT,
  ALTER COLUMN "delivered_at" TYPE TIMESTAMP(3);

-- ---------------------------------------------------------------------------
-- 4. Index renames (cosmetic; aligns with Prisma's schema-derived names so the
--    drift gate exits 0)
-- ---------------------------------------------------------------------------

ALTER INDEX IF EXISTS "forms_tenantId_slug_key"   RENAME TO "forms_tenant_id_slug_key";
ALTER INDEX IF EXISTS "forms_tenantId_status_idx" RENAME TO "forms_tenant_id_status_idx";

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class
    WHERE relname = 'tenant_page_kind_scope_idx' AND relkind = 'i'
  ) THEN
    ALTER INDEX "tenant_page_kind_scope_idx" RENAME TO "tenant_pages_tenant_id_kind_scope_idx";
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Drop nav_menus (model retired in PR #502; the original drop migration
--    sorted before a later create migration, so the table came back)
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS "nav_menus";

-- ---------------------------------------------------------------------------
-- 6. site_templates FK upgrade — add ON UPDATE CASCADE to match schema. The
--    original migration created these FKs without an ON UPDATE clause (PG
--    default NO ACTION); schema declares the related field with the implicit
--    Prisma cascade-on-update.
-- ---------------------------------------------------------------------------

ALTER TABLE "site_templates" DROP CONSTRAINT IF EXISTS "site_templates_owner_tenant_id_fkey";
ALTER TABLE "site_templates" DROP CONSTRAINT IF EXISTS "site_templates_parent_template_id_fkey";

DO $$ BEGIN
  ALTER TABLE "site_templates"
    ADD CONSTRAINT "site_templates_parent_template_id_fkey"
      FOREIGN KEY ("parent_template_id") REFERENCES "site_templates"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "site_templates"
    ADD CONSTRAINT "site_templates_owner_tenant_id_fkey"
      FOREIGN KEY ("owner_tenant_id") REFERENCES "tenants"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
