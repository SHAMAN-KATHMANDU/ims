-- CreateEnum
CREATE TYPE "MetaCredentialKind" AS ENUM ('PAGE', 'ADS');

-- CreateTable
CREATE TABLE "meta_integrations" (
    "meta_integration_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "app_id" VARCHAR(255),
    "app_secret_enc" TEXT,
    "default_page_id" VARCHAR(255),
    "default_ad_account_id" VARCHAR(255),
    "graph_api_version" VARCHAR(16),
    "status" "ChannelStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_integrations_pkey" PRIMARY KEY ("meta_integration_id")
);

-- CreateTable
CREATE TABLE "meta_credentials" (
    "meta_credential_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "kind" "MetaCredentialKind" NOT NULL,
    "external_id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "access_token_enc" TEXT NOT NULL,
    "metadata" JSONB,
    "status" "ChannelStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_credentials_pkey" PRIMARY KEY ("meta_credential_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meta_integrations_tenant_id_key" ON "meta_integrations"("tenant_id");

-- CreateIndex
CREATE INDEX "meta_credentials_tenant_id_idx" ON "meta_credentials"("tenant_id");

-- CreateIndex
CREATE INDEX "meta_credentials_integration_id_idx" ON "meta_credentials"("integration_id");

-- CreateIndex
CREATE UNIQUE INDEX "meta_credentials_tenant_id_kind_external_id_key" ON "meta_credentials"("tenant_id", "kind", "external_id");

-- AddForeignKey
ALTER TABLE "meta_integrations" ADD CONSTRAINT "meta_integrations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_credentials" ADD CONSTRAINT "meta_credentials_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_credentials" ADD CONSTRAINT "meta_credentials_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "meta_integrations"("meta_integration_id") ON DELETE CASCADE ON UPDATE CASCADE;
