-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "journey_type" VARCHAR(100),
ADD COLUMN     "source" VARCHAR(100);

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "contact_id" TEXT;

-- CreateTable
CREATE TABLE "crm_sources" (
    "crm_source_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_sources_pkey" PRIMARY KEY ("crm_source_id")
);

-- CreateIndex
CREATE INDEX "crm_sources_tenant_id_idx" ON "crm_sources"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "crm_sources_tenant_id_name_key" ON "crm_sources"("tenant_id", "name");

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("contact_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_sources" ADD CONSTRAINT "crm_sources_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
