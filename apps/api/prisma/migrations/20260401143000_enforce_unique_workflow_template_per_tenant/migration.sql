-- Enforce a single installed workflow per template key within each tenant.
-- NULL template keys remain allowed for custom workflows.

CREATE UNIQUE INDEX "pipeline_workflows_tenant_id_template_key_key"
ON "pipeline_workflows"("tenant_id", "template_key");
