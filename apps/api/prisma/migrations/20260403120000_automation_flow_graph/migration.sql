-- AlterTable
ALTER TABLE "automation_definitions" ADD COLUMN "flow_graph" JSONB;

-- AlterTable: graph-backed runs use graph_node_id; linear runs keep automation_step_id
ALTER TABLE "automation_run_steps" ADD COLUMN "graph_node_id" VARCHAR(36);
ALTER TABLE "automation_run_steps" ALTER COLUMN "automation_step_id" DROP NOT NULL;

CREATE INDEX "automation_run_steps_graph_node_id_idx" ON "automation_run_steps"("graph_node_id");
