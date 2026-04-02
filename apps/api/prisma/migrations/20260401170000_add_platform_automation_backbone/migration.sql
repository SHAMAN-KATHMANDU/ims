CREATE TYPE "AutomationScopeType" AS ENUM ('GLOBAL', 'CRM_PIPELINE', 'LOCATION', 'PRODUCT_VARIATION');
CREATE TYPE "AutomationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');
CREATE TYPE "AutomationSource" AS ENUM ('MANUAL', 'TEMPLATE', 'MIGRATED_CRM');
CREATE TYPE "AutomationExecutionMode" AS ENUM ('LIVE', 'SHADOW');
CREATE TYPE "AutomationEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');
CREATE TYPE "AutomationRunStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED');
CREATE TYPE "WorkItemType" AS ENUM ('TASK', 'APPROVAL', 'TRANSFER_REQUEST', 'RESTOCK_REQUEST', 'FOLLOW_UP');
CREATE TYPE "WorkItemStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "WorkItemPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "InventorySignalStatus" AS ENUM ('ACTIVE', 'RESOLVED');

CREATE TABLE "automation_definitions" (
  "automation_definition_id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" VARCHAR(1000),
  "scope_type" "AutomationScopeType" NOT NULL,
  "scope_id" TEXT,
  "status" "AutomationStatus" NOT NULL DEFAULT 'ACTIVE',
  "source" "AutomationSource" NOT NULL DEFAULT 'MANUAL',
  "execution_mode" "AutomationExecutionMode" NOT NULL DEFAULT 'LIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_by_id" TEXT NOT NULL,
  "updated_by_id" TEXT,
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "automation_definitions_pkey" PRIMARY KEY ("automation_definition_id")
);

CREATE TABLE "automation_triggers" (
  "automation_trigger_id" TEXT NOT NULL,
  "automation_definition_id" TEXT NOT NULL,
  "event_name" VARCHAR(120) NOT NULL,
  "condition_groups" JSONB,
  "delay_minutes" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "automation_triggers_pkey" PRIMARY KEY ("automation_trigger_id")
);

CREATE TABLE "automation_steps" (
  "automation_step_id" TEXT NOT NULL,
  "automation_definition_id" TEXT NOT NULL,
  "step_order" INTEGER NOT NULL DEFAULT 0,
  "action_type" VARCHAR(120) NOT NULL,
  "action_config" JSONB NOT NULL,
  "continue_on_error" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "automation_steps_pkey" PRIMARY KEY ("automation_step_id")
);

CREATE TABLE "automation_events" (
  "automation_event_id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "event_name" VARCHAR(120) NOT NULL,
  "scope_type" "AutomationScopeType",
  "scope_id" TEXT,
  "entity_type" VARCHAR(100) NOT NULL,
  "entity_id" TEXT NOT NULL,
  "actor_user_id" TEXT,
  "dedupe_key" VARCHAR(255),
  "status" "AutomationEventStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "payload" JSONB NOT NULL,
  "error_message" VARCHAR(2000),
  "occurred_at" TIMESTAMP(3) NOT NULL,
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "automation_events_pkey" PRIMARY KEY ("automation_event_id")
);

CREATE TABLE "automation_runs" (
  "automation_run_id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "automation_definition_id" TEXT NOT NULL,
  "automation_event_id" TEXT,
  "status" "AutomationRunStatus" NOT NULL,
  "event_name" VARCHAR(120) NOT NULL,
  "entity_type" VARCHAR(100) NOT NULL,
  "entity_id" TEXT NOT NULL,
  "dedupe_key" VARCHAR(255),
  "actor_user_id" TEXT,
  "trigger_payload" JSONB NOT NULL,
  "step_output" JSONB,
  "error_message" VARCHAR(2000),
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "automation_runs_pkey" PRIMARY KEY ("automation_run_id")
);

CREATE TABLE "automation_run_steps" (
  "automation_run_step_id" TEXT NOT NULL,
  "automation_run_id" TEXT NOT NULL,
  "automation_step_id" TEXT NOT NULL,
  "status" "AutomationRunStatus" NOT NULL,
  "output" JSONB,
  "error_message" VARCHAR(2000),
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "automation_run_steps_pkey" PRIMARY KEY ("automation_run_step_id")
);

CREATE TABLE "work_items" (
  "work_item_id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "automation_definition_id" TEXT,
  "automation_run_id" TEXT,
  "type" "WorkItemType" NOT NULL,
  "status" "WorkItemStatus" NOT NULL DEFAULT 'OPEN',
  "priority" "WorkItemPriority" NOT NULL DEFAULT 'MEDIUM',
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "due_date" TIMESTAMP(3),
  "sla_due_at" TIMESTAMP(3),
  "assigned_to_id" TEXT,
  "created_by_id" TEXT,
  "completed_at" TIMESTAMP(3),
  "completed_by_id" TEXT,
  "prefill_payload" JSONB,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_items_pkey" PRIMARY KEY ("work_item_id")
);

CREATE TABLE "inventory_signals" (
  "inventory_signal_id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "location_id" TEXT NOT NULL,
  "variation_id" TEXT NOT NULL,
  "sub_variation_id" TEXT,
  "status" "InventorySignalStatus" NOT NULL DEFAULT 'ACTIVE',
  "threshold" INTEGER NOT NULL,
  "current_quantity" INTEGER NOT NULL,
  "recommended_source_location_id" TEXT,
  "detected_by_id" TEXT,
  "metadata" JSONB,
  "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_signals_pkey" PRIMARY KEY ("inventory_signal_id")
);

CREATE TABLE "work_item_links" (
  "work_item_link_id" TEXT NOT NULL,
  "work_item_id" TEXT NOT NULL,
  "entity_type" VARCHAR(100) NOT NULL,
  "entity_id" TEXT NOT NULL,
  "inventory_signal_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_item_links_pkey" PRIMARY KEY ("work_item_link_id")
);

CREATE UNIQUE INDEX "automation_definitions_tenant_id_scope_type_scope_id_name_key"
ON "automation_definitions"("tenant_id", "scope_type", "scope_id", "name");

CREATE UNIQUE INDEX "automation_events_tenant_id_dedupe_key_key"
ON "automation_events"("tenant_id", "dedupe_key");

CREATE UNIQUE INDEX "automation_runs_automation_definition_id_dedupe_key_key"
ON "automation_runs"("automation_definition_id", "dedupe_key");

CREATE INDEX "automation_definitions_tenant_id_status_idx"
ON "automation_definitions"("tenant_id", "status");

CREATE INDEX "automation_definitions_tenant_id_scope_type_scope_id_idx"
ON "automation_definitions"("tenant_id", "scope_type", "scope_id");

CREATE INDEX "automation_triggers_automation_definition_id_idx"
ON "automation_triggers"("automation_definition_id");

CREATE INDEX "automation_triggers_event_name_idx"
ON "automation_triggers"("event_name");

CREATE INDEX "automation_steps_automation_definition_id_step_order_idx"
ON "automation_steps"("automation_definition_id", "step_order");

CREATE INDEX "automation_events_tenant_id_status_occurred_at_idx"
ON "automation_events"("tenant_id", "status", "occurred_at");

CREATE INDEX "automation_events_tenant_id_event_name_scope_type_scope_id_idx"
ON "automation_events"("tenant_id", "event_name", "scope_type", "scope_id");

CREATE INDEX "automation_runs_tenant_id_automation_definition_id_started_at_idx"
ON "automation_runs"("tenant_id", "automation_definition_id", "started_at");

CREATE INDEX "automation_runs_automation_definition_id_status_idx"
ON "automation_runs"("automation_definition_id", "status");

CREATE INDEX "automation_run_steps_automation_run_id_idx"
ON "automation_run_steps"("automation_run_id");

CREATE INDEX "automation_run_steps_automation_step_id_idx"
ON "automation_run_steps"("automation_step_id");

CREATE INDEX "work_items_tenant_id_status_priority_idx"
ON "work_items"("tenant_id", "status", "priority");

CREATE INDEX "work_items_assigned_to_id_status_idx"
ON "work_items"("assigned_to_id", "status");

CREATE INDEX "inventory_signals_tenant_id_status_idx"
ON "inventory_signals"("tenant_id", "status");

CREATE INDEX "inventory_signals_location_id_variation_id_sub_variation_id_idx"
ON "inventory_signals"("location_id", "variation_id", "sub_variation_id");

CREATE INDEX "work_item_links_work_item_id_idx"
ON "work_item_links"("work_item_id");

CREATE INDEX "work_item_links_entity_type_entity_id_idx"
ON "work_item_links"("entity_type", "entity_id");

ALTER TABLE "automation_definitions"
ADD CONSTRAINT "automation_definitions_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "automation_definitions"
ADD CONSTRAINT "automation_definitions_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "automation_definitions"
ADD CONSTRAINT "automation_definitions_updated_by_id_fkey"
FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "automation_triggers"
ADD CONSTRAINT "automation_triggers_automation_definition_id_fkey"
FOREIGN KEY ("automation_definition_id") REFERENCES "automation_definitions"("automation_definition_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "automation_steps"
ADD CONSTRAINT "automation_steps_automation_definition_id_fkey"
FOREIGN KEY ("automation_definition_id") REFERENCES "automation_definitions"("automation_definition_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "automation_events"
ADD CONSTRAINT "automation_events_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "automation_events"
ADD CONSTRAINT "automation_events_actor_user_id_fkey"
FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "automation_runs"
ADD CONSTRAINT "automation_runs_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "automation_runs"
ADD CONSTRAINT "automation_runs_automation_definition_id_fkey"
FOREIGN KEY ("automation_definition_id") REFERENCES "automation_definitions"("automation_definition_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "automation_runs"
ADD CONSTRAINT "automation_runs_automation_event_id_fkey"
FOREIGN KEY ("automation_event_id") REFERENCES "automation_events"("automation_event_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "automation_runs"
ADD CONSTRAINT "automation_runs_actor_user_id_fkey"
FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "automation_run_steps"
ADD CONSTRAINT "automation_run_steps_automation_run_id_fkey"
FOREIGN KEY ("automation_run_id") REFERENCES "automation_runs"("automation_run_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "automation_run_steps"
ADD CONSTRAINT "automation_run_steps_automation_step_id_fkey"
FOREIGN KEY ("automation_step_id") REFERENCES "automation_steps"("automation_step_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "work_items"
ADD CONSTRAINT "work_items_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "work_items"
ADD CONSTRAINT "work_items_automation_definition_id_fkey"
FOREIGN KEY ("automation_definition_id") REFERENCES "automation_definitions"("automation_definition_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "work_items"
ADD CONSTRAINT "work_items_automation_run_id_fkey"
FOREIGN KEY ("automation_run_id") REFERENCES "automation_runs"("automation_run_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "work_items"
ADD CONSTRAINT "work_items_assigned_to_id_fkey"
FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "work_items"
ADD CONSTRAINT "work_items_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "work_items"
ADD CONSTRAINT "work_items_completed_by_id_fkey"
FOREIGN KEY ("completed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "inventory_signals"
ADD CONSTRAINT "inventory_signals_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventory_signals"
ADD CONSTRAINT "inventory_signals_location_id_fkey"
FOREIGN KEY ("location_id") REFERENCES "locations"("location_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_signals"
ADD CONSTRAINT "inventory_signals_variation_id_fkey"
FOREIGN KEY ("variation_id") REFERENCES "product_variations"("variation_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_signals"
ADD CONSTRAINT "inventory_signals_sub_variation_id_fkey"
FOREIGN KEY ("sub_variation_id") REFERENCES "product_sub_variations"("sub_variation_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "inventory_signals"
ADD CONSTRAINT "inventory_signals_recommended_source_location_id_fkey"
FOREIGN KEY ("recommended_source_location_id") REFERENCES "locations"("location_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "inventory_signals"
ADD CONSTRAINT "inventory_signals_detected_by_id_fkey"
FOREIGN KEY ("detected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "work_item_links"
ADD CONSTRAINT "work_item_links_work_item_id_fkey"
FOREIGN KEY ("work_item_id") REFERENCES "work_items"("work_item_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "work_item_links"
ADD CONSTRAINT "work_item_links_inventory_signal_id_fkey"
FOREIGN KEY ("inventory_signal_id") REFERENCES "inventory_signals"("inventory_signal_id") ON DELETE SET NULL ON UPDATE CASCADE;
