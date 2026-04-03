-- Expand-contract hardening for automation reliability and migration coexistence.

ALTER TABLE "product_variations"
ADD COLUMN "low_stock_threshold" INTEGER;

ALTER TABLE "product_sub_variations"
ADD COLUMN "low_stock_threshold" INTEGER;

ALTER TABLE "transfers"
ADD COLUMN "source_inventory_signal_id" TEXT;

ALTER TABLE "transfers"
ADD COLUMN "automation_run_id" TEXT;

ALTER TABLE "automation_definitions"
ADD COLUMN "suppress_legacy_workflows" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "automation_events"
ADD COLUMN "last_attempt_at" TIMESTAMP(3);

ALTER TABLE "automation_events"
ADD COLUMN "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "automation_events"
ADD COLUMN "processing_started_at" TIMESTAMP(3);

ALTER TABLE "automation_runs"
ADD COLUMN "execution_mode" "AutomationExecutionMode" NOT NULL DEFAULT 'LIVE';

CREATE INDEX "transfers_source_inventory_signal_id_status_idx"
ON "transfers"("source_inventory_signal_id", "status");

CREATE INDEX "transfers_automation_run_id_idx"
ON "transfers"("automation_run_id");

CREATE INDEX "automation_events_tenant_id_status_next_attempt_at_idx"
ON "automation_events"("tenant_id", "status", "next_attempt_at");

ALTER TABLE "transfers"
ADD CONSTRAINT "transfers_source_inventory_signal_id_fkey"
FOREIGN KEY ("source_inventory_signal_id") REFERENCES "inventory_signals"("inventory_signal_id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "transfers"
ADD CONSTRAINT "transfers_automation_run_id_fkey"
FOREIGN KEY ("automation_run_id") REFERENCES "automation_runs"("automation_run_id")
ON DELETE SET NULL ON UPDATE CASCADE;
