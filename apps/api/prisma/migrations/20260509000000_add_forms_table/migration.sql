-- AddColumn formId to form_submissions
ALTER TABLE "form_submissions" ADD COLUMN "form_id" VARCHAR;

-- CreateTable forms
CREATE TABLE "forms" (
    "id" VARCHAR NOT NULL,
    "tenant_id" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "slug" VARCHAR NOT NULL,
    "description" TEXT,
    "fields" JSONB NOT NULL,
    "submit_to" VARCHAR(20) NOT NULL DEFAULT 'email',
    "recipients" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "success_message" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "submission_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "forms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex forms_tenantId_slug_key
CREATE UNIQUE INDEX "forms_tenantId_slug_key" ON "forms"("tenant_id", "slug");

-- CreateIndex forms_tenantId_status_idx
CREATE INDEX "forms_tenantId_status_idx" ON "forms"("tenant_id", "status");

-- AddForeignKey for form_submissions.form_id
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey for forms.tenant_id
ALTER TABLE "forms" ADD CONSTRAINT "forms_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
