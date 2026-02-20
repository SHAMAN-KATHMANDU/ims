-- CreateEnum
CREATE TYPE "AddOnType" AS ENUM ('EXTRA_USER', 'EXTRA_PRODUCT', 'EXTRA_LOCATION', 'EXTRA_MEMBER', 'EXTRA_CATEGORY', 'EXTRA_CONTACT');

-- CreateEnum
CREATE TYPE "AddOnStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "plan_limits" ADD COLUMN     "max_categories" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "max_contacts" INTEGER NOT NULL DEFAULT 100;

-- CreateTable
CREATE TABLE "add_on_pricing" (
    "id" TEXT NOT NULL,
    "type" "AddOnType" NOT NULL,
    "tier" "PlanTier",
    "billing_cycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "unit_price" DECIMAL(12,2) NOT NULL,
    "min_quantity" INTEGER NOT NULL DEFAULT 1,
    "max_quantity" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "add_on_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_add_ons" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" "AddOnType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "AddOnStatus" NOT NULL DEFAULT 'PENDING',
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "payment_id" TEXT,
    "notes" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_add_ons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "add_on_pricing_type_tier_billing_cycle_key" ON "add_on_pricing"("type", "tier", "billing_cycle");

-- AddForeignKey
ALTER TABLE "tenant_add_ons" ADD CONSTRAINT "tenant_add_ons_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
