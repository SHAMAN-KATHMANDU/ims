-- CreateEnum
CREATE TYPE "PipelineType" AS ENUM ('GENERAL', 'NEW_SALES', 'REMARKETING', 'REPURCHASE');

-- CreateEnum
CREATE TYPE "SequenceStatus" AS ENUM ('PENDING', 'EXECUTED', 'SKIPPED', 'PAUSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WorkflowAction" ADD VALUE 'CREATE_DEAL';
ALTER TYPE "WorkflowAction" ADD VALUE 'UPDATE_CONTACT_FIELD';
ALTER TYPE "WorkflowAction" ADD VALUE 'APPLY_TAG';
ALTER TYPE "WorkflowAction" ADD VALUE 'REMOVE_TAG';

-- AlterEnum
ALTER TYPE "WorkflowTrigger" ADD VALUE 'PURCHASE_COUNT_CHANGED';

-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "purchase_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "pipelines" ADD COLUMN     "type" "PipelineType" NOT NULL DEFAULT 'GENERAL';

-- CreateTable
CREATE TABLE "remarketing_sequences" (
    "sequence_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "deal_id" TEXT,
    "sequence_day" INTEGER NOT NULL,
    "message" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "executed_at" TIMESTAMP(3),
    "status" "SequenceStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "remarketing_sequences_pkey" PRIMARY KEY ("sequence_id")
);

-- CreateIndex
CREATE INDEX "remarketing_sequences_tenant_id_idx" ON "remarketing_sequences"("tenant_id");

-- CreateIndex
CREATE INDEX "remarketing_sequences_status_scheduled_at_idx" ON "remarketing_sequences"("status", "scheduled_at");

-- AddForeignKey
ALTER TABLE "remarketing_sequences" ADD CONSTRAINT "remarketing_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remarketing_sequences" ADD CONSTRAINT "remarketing_sequences_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("contact_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remarketing_sequences" ADD CONSTRAINT "remarketing_sequences_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("deal_id") ON DELETE SET NULL ON UPDATE CASCADE;
