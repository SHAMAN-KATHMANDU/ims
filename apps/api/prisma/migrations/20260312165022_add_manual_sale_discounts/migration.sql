-- AlterTable
ALTER TABLE "sale_items" ADD COLUMN     "discount_approved_by_id" TEXT,
ADD COLUMN     "discount_reason" VARCHAR(500),
ADD COLUMN     "manual_discount_amount" DECIMAL(12,2),
ADD COLUMN     "manual_discount_percent" DECIMAL(5,2);

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_discount_approved_by_id_fkey" FOREIGN KEY ("discount_approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
