-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "delete_reason" VARCHAR(500),
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
