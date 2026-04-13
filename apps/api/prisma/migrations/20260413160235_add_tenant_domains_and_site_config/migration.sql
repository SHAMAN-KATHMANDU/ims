-- CreateEnum
CREATE TYPE "TenantDomainApp" AS ENUM ('WEBSITE', 'IMS', 'API');

-- CreateEnum
CREATE TYPE "TenantDomainTls" AS ENUM ('PENDING', 'ACTIVE', 'FAILED');

-- CreateTable
CREATE TABLE "tenant_domains" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "app_type" "TenantDomainApp" NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "verify_token" TEXT NOT NULL,
    "verified_at" TIMESTAMP(3),
    "tls_status" "TenantDomainTls" NOT NULL DEFAULT 'PENDING',
    "tls_last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_configs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branding" JSONB,
    "contact" JSONB,
    "features" JSONB,
    "seo" JSONB,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_domains_hostname_key" ON "tenant_domains"("hostname");

-- CreateIndex
CREATE INDEX "tenant_domains_tenant_id_idx" ON "tenant_domains"("tenant_id");

-- CreateIndex
CREATE INDEX "tenant_domains_app_type_idx" ON "tenant_domains"("app_type");

-- CreateIndex
CREATE UNIQUE INDEX "site_configs_tenant_id_key" ON "site_configs"("tenant_id");

-- AddForeignKey
ALTER TABLE "tenant_domains" ADD CONSTRAINT "tenant_domains_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_configs" ADD CONSTRAINT "site_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
