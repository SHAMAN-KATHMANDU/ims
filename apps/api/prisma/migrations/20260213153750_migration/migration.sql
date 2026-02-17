/*
  Warnings:

  - A unique constraint covering the columns `[member_id]` on the table `contacts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "member_id" TEXT;

-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "member_id" TEXT;

-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "member_id" TEXT;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "member_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "contacts_member_id_key" ON "contacts"("member_id");

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE SET NULL ON UPDATE CASCADE;
