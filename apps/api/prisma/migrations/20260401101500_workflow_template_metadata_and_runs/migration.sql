-- Workflow metadata, provenance, and execution history

CREATE TYPE "WorkflowOrigin" AS ENUM ('CUSTOM', 'TEMPLATE', 'SYSTEM');
CREATE TYPE "WorkflowRunStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED');

ALTER TABLE "pipeline_workflows"
ADD COLUMN "description" VARCHAR(500),
ADD COLUMN "template_key" VARCHAR(120),
ADD COLUMN "template_version" INTEGER,
ADD COLUMN "origin" "WorkflowOrigin" NOT NULL DEFAULT 'CUSTOM',
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "published_at" TIMESTAMP(3),
ADD COLUMN "last_run_at" TIMESTAMP(3),
ADD COLUMN "last_error_at" TIMESTAMP(3),
ADD COLUMN "run_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "failure_count" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "pipeline_workflows_tenant_id_template_key_idx"
ON "pipeline_workflows"("tenant_id", "template_key");

CREATE TABLE "workflow_runs" (
  "workflow_run_id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "workflow_id" TEXT NOT NULL,
  "rule_id" TEXT,
  "trigger" "WorkflowTrigger" NOT NULL,
  "action" "WorkflowAction",
  "status" "WorkflowRunStatus" NOT NULL,
  "entity_type" VARCHAR(50) NOT NULL DEFAULT 'DEAL',
  "entity_id" TEXT NOT NULL,
  "dedupe_key" VARCHAR(255),
  "attempt" INTEGER NOT NULL DEFAULT 1,
  "error_message" VARCHAR(2000),
  "metadata" JSONB,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("workflow_run_id")
);

CREATE INDEX "workflow_runs_tenant_id_workflow_id_started_at_idx"
ON "workflow_runs"("tenant_id", "workflow_id", "started_at");

CREATE INDEX "workflow_runs_workflow_id_status_idx"
ON "workflow_runs"("workflow_id", "status");

CREATE UNIQUE INDEX "workflow_runs_workflow_id_dedupe_key_key"
ON "workflow_runs"("workflow_id", "dedupe_key");

ALTER TABLE "workflow_runs"
ADD CONSTRAINT "workflow_runs_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflow_runs"
ADD CONSTRAINT "workflow_runs_workflow_id_fkey"
FOREIGN KEY ("workflow_id") REFERENCES "pipeline_workflows"("workflow_id")
ON DELETE CASCADE ON UPDATE CASCADE;
