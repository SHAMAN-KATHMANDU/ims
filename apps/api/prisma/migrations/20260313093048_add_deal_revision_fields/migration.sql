-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "edit_reason" VARCHAR(500),
ADD COLUMN     "edited_at" TIMESTAMP(3),
ADD COLUMN     "edited_by_id" TEXT,
ADD COLUMN     "is_latest" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "parent_deal_id" TEXT,
ADD COLUMN     "revision_no" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "deals_parent_deal_id_idx" ON "deals"("parent_deal_id");

-- CreateIndex
CREATE INDEX "deals_is_latest_idx" ON "deals"("is_latest");

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_edited_by_id_fkey" FOREIGN KEY ("edited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_parent_deal_id_fkey" FOREIGN KEY ("parent_deal_id") REFERENCES "deals"("deal_id") ON DELETE SET NULL ON UPDATE CASCADE;
