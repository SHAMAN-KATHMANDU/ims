-- CreateEnum
CREATE TYPE "DiscountValueType" AS ENUM ('PERCENTAGE', 'FLAT');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PROSPECT', 'VIP');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'CHEQUE', 'FONEPAY', 'QR');

-- CreateEnum
CREATE TYPE "PromoEligibility" AS ENUM ('ALL', 'MEMBER', 'NON_MEMBER', 'WHOLESALE');

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "address" TEXT,
ADD COLUMN     "age" INTEGER,
ADD COLUMN     "birthday" TIMESTAMP(3),
ADD COLUMN     "first_purchase" TIMESTAMP(3),
ADD COLUMN     "gender" VARCHAR(20),
ADD COLUMN     "member_since" TIMESTAMP(3),
ADD COLUMN     "member_status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "total_sales" DECIMAL(12,2) DEFAULT 0;

-- AlterTable
ALTER TABLE "product_discounts" ADD COLUMN     "value" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "value_type" "DiscountValueType" NOT NULL DEFAULT 'PERCENTAGE';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "final_sp" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "sub_category" VARCHAR(255),
ADD COLUMN     "vendor_id" TEXT;

-- AlterTable
ALTER TABLE "sale_items" ADD COLUMN     "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "total_mrp" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "vendors" (
    "vendor_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "contact" VARCHAR(255),
    "phone" VARCHAR(50),
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("vendor_id")
);

-- CreateTable
CREATE TABLE "sale_payments" (
    "payment_id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_payments_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "promo_codes" (
    "promo_id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "value_type" "DiscountValueType" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "override_discounts" BOOLEAN NOT NULL DEFAULT false,
    "allow_stacking" BOOLEAN NOT NULL DEFAULT false,
    "eligibility" "PromoEligibility" NOT NULL DEFAULT 'ALL',
    "valid_from" TIMESTAMP(3),
    "valid_to" TIMESTAMP(3),
    "usage_limit" INTEGER,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("promo_id")
);

-- CreateTable
CREATE TABLE "promo_code_products" (
    "promo_product_id" TEXT NOT NULL,
    "promo_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,

    CONSTRAINT "promo_code_products_pkey" PRIMARY KEY ("promo_product_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vendors_name_key" ON "vendors"("name");

-- CreateIndex
CREATE UNIQUE INDEX "promo_codes_code_key" ON "promo_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "promo_code_products_promo_id_product_id_key" ON "promo_code_products"("promo_id", "product_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("vendor_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("sale_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_code_products" ADD CONSTRAINT "promo_code_products_promo_id_fkey" FOREIGN KEY ("promo_id") REFERENCES "promo_codes"("promo_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_code_products" ADD CONSTRAINT "promo_code_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE CASCADE ON UPDATE CASCADE;
