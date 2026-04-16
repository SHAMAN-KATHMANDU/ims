-- Form submissions from the tenant-site form block.
-- Additive. No existing data touched.

CREATE TABLE "form_submissions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "submit_to" VARCHAR(20) NOT NULL DEFAULT 'email',
    "lead_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "form_submissions_tenant_id_created_at_idx"
  ON "form_submissions"("tenant_id", "created_at");

ALTER TABLE "form_submissions"
  ADD CONSTRAINT "form_submissions_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
