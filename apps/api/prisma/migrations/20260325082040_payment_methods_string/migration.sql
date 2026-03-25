-- AlterTable
ALTER TABLE "sale_payments"
ALTER COLUMN "method" TYPE VARCHAR(32) USING "method"::text;

-- DropEnum
DROP TYPE "PaymentMethod";
