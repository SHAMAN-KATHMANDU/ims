-- CreateEnum
CREATE TYPE "WorkflowTrigger" AS ENUM ('STAGE_ENTER', 'STAGE_EXIT', 'DEAL_CREATED', 'DEAL_WON', 'DEAL_LOST');

-- CreateEnum
CREATE TYPE "WorkflowAction" AS ENUM ('CREATE_TASK', 'SEND_NOTIFICATION', 'MOVE_STAGE', 'UPDATE_FIELD', 'CREATE_ACTIVITY');

-- CreateTable
CREATE TABLE "pipeline_workflows" (
    "workflow_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "pipeline_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_workflows_pkey" PRIMARY KEY ("workflow_id")
);

-- CreateTable
CREATE TABLE "workflow_rules" (
    "rule_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "trigger" "WorkflowTrigger" NOT NULL,
    "trigger_stage_id" VARCHAR(100),
    "action" "WorkflowAction" NOT NULL,
    "action_config" JSONB NOT NULL,
    "rule_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_rules_pkey" PRIMARY KEY ("rule_id")
);

-- CreateIndex
CREATE INDEX "pipeline_workflows_tenant_id_idx" ON "pipeline_workflows"("tenant_id");

-- CreateIndex
CREATE INDEX "pipeline_workflows_pipeline_id_idx" ON "pipeline_workflows"("pipeline_id");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_workflows_tenant_id_pipeline_id_name_key" ON "pipeline_workflows"("tenant_id", "pipeline_id", "name");

-- CreateIndex
CREATE INDEX "workflow_rules_workflow_id_idx" ON "workflow_rules"("workflow_id");

-- AddForeignKey
ALTER TABLE "pipeline_workflows" ADD CONSTRAINT "pipeline_workflows_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_workflows" ADD CONSTRAINT "pipeline_workflows_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "pipelines"("pipeline_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_rules" ADD CONSTRAINT "workflow_rules_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "pipeline_workflows"("workflow_id") ON DELETE CASCADE ON UPDATE CASCADE;
