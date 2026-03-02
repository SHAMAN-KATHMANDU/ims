-- CreateTable
CREATE TABLE "crm_journey_types" (
    "crm_journey_type_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_journey_types_pkey" PRIMARY KEY ("crm_journey_type_id")
);

-- CreateIndex
CREATE INDEX "crm_journey_types_tenant_id_idx" ON "crm_journey_types"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "crm_journey_types_tenant_id_name_key" ON "crm_journey_types"("tenant_id", "name");

-- AddForeignKey
ALTER TABLE "crm_journey_types" ADD CONSTRAINT "crm_journey_types_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
