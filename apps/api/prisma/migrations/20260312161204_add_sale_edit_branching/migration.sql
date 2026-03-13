-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "edit_reason" VARCHAR(500),
ADD COLUMN     "edited_at" TIMESTAMP(3),
ADD COLUMN     "edited_by_id" TEXT,
ADD COLUMN     "is_latest" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "parent_sale_id" TEXT,
ADD COLUMN     "revision_no" INTEGER NOT NULL DEFAULT 1;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_edited_by_id_fkey" FOREIGN KEY ("edited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_parent_sale_id_fkey" FOREIGN KEY ("parent_sale_id") REFERENCES "sales"("sale_id") ON DELETE SET NULL ON UPDATE CASCADE;
