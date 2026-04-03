-- CreateEnum
CREATE TYPE "AutomationDelayedRunStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "automation_delayed_runs" (
    "automation_delayed_run_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "automation_event_id" TEXT NOT NULL,
    "automation_definition_id" TEXT NOT NULL,
    "automation_trigger_id" TEXT NOT NULL,
    "fire_at" TIMESTAMP(3) NOT NULL,
    "status" "AutomationDelayedRunStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" VARCHAR(2000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "automation_delayed_runs_pkey" PRIMARY KEY ("automation_delayed_run_id")
);

-- CreateIndex
CREATE INDEX "automation_delayed_runs_tenant_id_status_fire_at_idx" ON "automation_delayed_runs"("tenant_id", "status", "fire_at");

-- CreateIndex
CREATE UNIQUE INDEX "automation_delayed_runs_automation_event_id_automation_defi_key" ON "automation_delayed_runs"("automation_event_id", "automation_definition_id", "automation_trigger_id");

-- AddForeignKey
ALTER TABLE "automation_delayed_runs" ADD CONSTRAINT "automation_delayed_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_delayed_runs" ADD CONSTRAINT "automation_delayed_runs_automation_event_id_fkey" FOREIGN KEY ("automation_event_id") REFERENCES "automation_events"("automation_event_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_delayed_runs" ADD CONSTRAINT "automation_delayed_runs_automation_definition_id_fkey" FOREIGN KEY ("automation_definition_id") REFERENCES "automation_definitions"("automation_definition_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_delayed_runs" ADD CONSTRAINT "automation_delayed_runs_automation_trigger_id_fkey" FOREIGN KEY ("automation_trigger_id") REFERENCES "automation_triggers"("automation_trigger_id") ON DELETE CASCADE ON UPDATE CASCADE;
