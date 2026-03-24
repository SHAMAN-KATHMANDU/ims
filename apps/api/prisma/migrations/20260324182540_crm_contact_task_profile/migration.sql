-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "TaskWorkflowStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "birth_date" TIMESTAMP(3),
ADD COLUMN     "gender" VARCHAR(20);

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "company_id" TEXT,
ADD COLUMN     "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "workflow_status" "TaskWorkflowStatus" NOT NULL DEFAULT 'OPEN';

-- Align status with legacy `completed` flag
UPDATE "tasks" SET "workflow_status" = 'DONE' WHERE "completed" = true;

-- CreateIndex
CREATE INDEX "tasks_company_id_idx" ON "tasks"("company_id");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE SET NULL ON UPDATE CASCADE;
