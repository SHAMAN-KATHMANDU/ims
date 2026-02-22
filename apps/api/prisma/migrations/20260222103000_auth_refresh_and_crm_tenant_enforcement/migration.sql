-- Refresh token persistence for rotation/revocation
CREATE TABLE "refresh_tokens" (
  "refresh_token_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "token_hash" VARCHAR(128) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "replaced_by_id" TEXT,
  "created_by_ip" VARCHAR(64),
  "user_agent" VARCHAR(512),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("refresh_token_id")
);

CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX "refresh_tokens_user_id_revoked_at_idx" ON "refresh_tokens"("user_id", "revoked_at");
CREATE INDEX "refresh_tokens_tenant_id_revoked_at_idx" ON "refresh_tokens"("tenant_id", "revoked_at");
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

ALTER TABLE "refresh_tokens"
  ADD CONSTRAINT "refresh_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "refresh_tokens"
  ADD CONSTRAINT "refresh_tokens_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "refresh_tokens"
  ADD CONSTRAINT "refresh_tokens_replaced_by_id_fkey"
  FOREIGN KEY ("replaced_by_id") REFERENCES "refresh_tokens"("refresh_token_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill CRM tenant_id values from related entities before NOT NULL constraints.
UPDATE "contacts" c
SET "tenant_id" = u."tenant_id"
FROM "users" u
WHERE c."tenant_id" IS NULL AND c."owned_by_id" = u."id";

UPDATE "leads" l
SET "tenant_id" = u."tenant_id"
FROM "users" u
WHERE l."tenant_id" IS NULL AND l."assigned_to_id" = u."id";

UPDATE "pipelines" p
SET "tenant_id" = d."tenant_id"
FROM "deals" d
WHERE p."tenant_id" IS NULL AND d."pipeline_id" = p."pipeline_id" AND d."tenant_id" IS NOT NULL;

UPDATE "deals" d
SET "tenant_id" = u."tenant_id"
FROM "users" u
WHERE d."tenant_id" IS NULL AND d."assigned_to_id" = u."id";

UPDATE "tasks" t
SET "tenant_id" = u."tenant_id"
FROM "users" u
WHERE t."tenant_id" IS NULL AND t."assigned_to_id" = u."id";

UPDATE "activities" a
SET "tenant_id" = u."tenant_id"
FROM "users" u
WHERE a."tenant_id" IS NULL AND a."created_by_id" = u."id";

UPDATE "companies" c
SET "tenant_id" = x."tenant_id"
FROM (
  SELECT con."company_id", MIN(con."tenant_id") AS "tenant_id"
  FROM "contacts" con
  WHERE con."company_id" IS NOT NULL AND con."tenant_id" IS NOT NULL
  GROUP BY con."company_id"
) x
WHERE c."tenant_id" IS NULL AND x."company_id" = c."company_id";

UPDATE "contact_tags" t
SET "tenant_id" = x."tenant_id"
FROM (
  SELECT ctl."tag_id", MIN(c."tenant_id") AS "tenant_id"
  FROM "contact_tag_links" ctl
  JOIN "contacts" c ON c."contact_id" = ctl."contact_id"
  WHERE c."tenant_id" IS NOT NULL
  GROUP BY ctl."tag_id"
) x
WHERE t."tenant_id" IS NULL AND x."tag_id" = t."tag_id";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "companies" WHERE "tenant_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce NOT NULL on companies.tenant_id; unresolved rows found.';
  END IF;
  IF EXISTS (SELECT 1 FROM "contact_tags" WHERE "tenant_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce NOT NULL on contact_tags.tenant_id; unresolved rows found.';
  END IF;
  IF EXISTS (SELECT 1 FROM "contacts" WHERE "tenant_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce NOT NULL on contacts.tenant_id; unresolved rows found.';
  END IF;
  IF EXISTS (SELECT 1 FROM "leads" WHERE "tenant_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce NOT NULL on leads.tenant_id; unresolved rows found.';
  END IF;
  IF EXISTS (SELECT 1 FROM "pipelines" WHERE "tenant_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce NOT NULL on pipelines.tenant_id; unresolved rows found.';
  END IF;
  IF EXISTS (SELECT 1 FROM "deals" WHERE "tenant_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce NOT NULL on deals.tenant_id; unresolved rows found.';
  END IF;
  IF EXISTS (SELECT 1 FROM "tasks" WHERE "tenant_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce NOT NULL on tasks.tenant_id; unresolved rows found.';
  END IF;
  IF EXISTS (SELECT 1 FROM "activities" WHERE "tenant_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce NOT NULL on activities.tenant_id; unresolved rows found.';
  END IF;
END $$;

ALTER TABLE "companies" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "contact_tags" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "contacts" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "leads" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "pipelines" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "deals" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "tasks" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "activities" ALTER COLUMN "tenant_id" SET NOT NULL;

-- Performance indexes for high-volume child and CRM tables
CREATE INDEX "transfer_logs_transfer_id_idx" ON "transfer_logs"("transfer_id");
CREATE INDEX "transfer_logs_user_id_created_at_idx" ON "transfer_logs"("user_id", "created_at");
CREATE INDEX "sales_tenant_id_member_id_idx" ON "sales"("tenant_id", "member_id");
CREATE INDEX "sale_items_sale_id_idx" ON "sale_items"("sale_id");
CREATE INDEX "sale_items_variation_id_idx" ON "sale_items"("variation_id");
CREATE INDEX "sale_payments_sale_id_idx" ON "sale_payments"("sale_id");
CREATE INDEX "contact_notes_contact_id_idx" ON "contact_notes"("contact_id");
CREATE INDEX "contact_attachments_contact_id_idx" ON "contact_attachments"("contact_id");
CREATE INDEX "contact_communications_contact_id_idx" ON "contact_communications"("contact_id");
CREATE INDEX "deals_assigned_to_id_status_idx" ON "deals"("assigned_to_id", "status");
CREATE INDEX "deals_tenant_id_status_updated_at_idx" ON "deals"("tenant_id", "status", "updated_at");
CREATE INDEX "tasks_tenant_id_completed_due_date_idx" ON "tasks"("tenant_id", "completed", "due_date");
CREATE INDEX "activities_tenant_id_activity_at_idx" ON "activities"("tenant_id", "activity_at");
