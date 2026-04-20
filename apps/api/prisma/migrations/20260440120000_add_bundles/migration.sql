-- CreateEnum
CREATE TYPE "bundle_pricing_mode" AS ENUM ('SUM', 'DISCOUNT_PCT', 'FIXED');

-- CreateTable
CREATE TABLE "bundles" (
    "bundle_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "product_ids" TEXT[],
    "pricing_strategy" "bundle_pricing_mode" NOT NULL DEFAULT 'SUM',
    "discount_pct" INTEGER,
    "fixed_price" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "bundles_pkey" PRIMARY KEY ("bundle_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bundles_tenant_id_slug_key" ON "bundles"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "bundles_tenant_id_active_idx" ON "bundles"("tenant_id", "active");

-- AddForeignKey
ALTER TABLE "bundles" ADD CONSTRAINT "bundles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
