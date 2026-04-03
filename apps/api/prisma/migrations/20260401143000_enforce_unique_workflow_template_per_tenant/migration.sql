-- Enforce a single installed workflow per template key within each tenant.
-- NULL template keys remain allowed for custom workflows.
-- Prisma 5.x cannot safely use CREATE INDEX CONCURRENTLY here, so prefer
-- a short lock timeout over an unbounded blocking index build during deploy.

SELECT set_config('lock_timeout', '5s', false);

WITH ranked_workflows AS (
  SELECT
    "workflow_id",
    "tenant_id",
    "template_key",
    ROW_NUMBER() OVER (
      PARTITION BY "tenant_id", "template_key"
      ORDER BY
        "updated_at" DESC,
        "created_at" DESC,
        "workflow_id" DESC
    ) AS row_num,
    FIRST_VALUE("workflow_id") OVER (
      PARTITION BY "tenant_id", "template_key"
      ORDER BY
        "updated_at" DESC,
        "created_at" DESC,
        "workflow_id" DESC
    ) AS canonical_workflow_id
  FROM "pipeline_workflows"
  WHERE "template_key" IS NOT NULL
),
duplicate_workflows AS (
  SELECT "workflow_id", canonical_workflow_id
  FROM ranked_workflows
  WHERE row_num > 1
)
UPDATE "workflow_runs"
SET
  "workflow_id" = duplicate_workflows.canonical_workflow_id,
  "rule_id" = NULL
FROM duplicate_workflows
WHERE "workflow_runs"."workflow_id" = duplicate_workflows."workflow_id";

WITH ranked_workflows AS (
  SELECT
    "workflow_id",
    ROW_NUMBER() OVER (
      PARTITION BY "tenant_id", "template_key"
      ORDER BY
        "updated_at" DESC,
        "created_at" DESC,
        "workflow_id" DESC
    ) AS row_num
  FROM "pipeline_workflows"
  WHERE "template_key" IS NOT NULL
)
DELETE FROM "pipeline_workflows"
USING ranked_workflows
WHERE "pipeline_workflows"."workflow_id" = ranked_workflows."workflow_id"
  AND ranked_workflows.row_num > 1;

CREATE UNIQUE INDEX "pipeline_workflows_tenant_id_template_key_key"
ON "pipeline_workflows"("tenant_id", "template_key");

SELECT set_config('lock_timeout', '0', false);
