-- Seed the three CRM framework pipelines (Sales / Remarketing / Repurchasing)
-- for every tenant, and make the Sales (NEW_SALES) pipeline each tenant's
-- default — moving the default off any ad-hoc pipeline (e.g. a hand-made "p").
--
-- Framework pipelines used to be opt-in (Settings -> "Setup Pipeline Framework"),
-- so existing tenants may have none, only some, or a custom default. This
-- backfills the standard three and re-points the default onto Sales.
--
-- Idempotent: a framework type a tenant already has (non-deleted) is skipped, so
-- customised names/stages are never overwritten; only the default flag is moved.
-- The stage shape matches the application's seedFrameworkPipelines() exactly:
-- { id, name, order } with a fresh UUID per stage. gen_random_uuid() is core
-- since PostgreSQL 13; pgcrypto is ensured as a safety net for older servers.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Insert any missing framework pipelines (one row per tenant per type). ----

-- Sales (NEW_SALES)
INSERT INTO "pipelines" (
  "pipeline_id", "tenant_id", "name", "type", "stages",
  "closed_won_stage_name", "closed_lost_stage_name", "is_default",
  "created_at", "updated_at"
)
SELECT
  gen_random_uuid()::text, t."id", 'Sales', 'NEW_SALES'::"PipelineType",
  jsonb_build_array(
    jsonb_build_object('id', gen_random_uuid()::text, 'name', 'New Lead',      'order', 1),
    jsonb_build_object('id', gen_random_uuid()::text, 'name', 'Qualified',     'order', 2),
    jsonb_build_object('id', gen_random_uuid()::text, 'name', 'Proposal Sent', 'order', 3),
    jsonb_build_object('id', gen_random_uuid()::text, 'name', 'Negotiating',   'order', 4),
    jsonb_build_object('id', gen_random_uuid()::text, 'name', 'Closed Won',    'order', 5),
    jsonb_build_object('id', gen_random_uuid()::text, 'name', 'Closed Lost',   'order', 6)
  ),
  'Closed Won', 'Closed Lost', false, now(), now()
FROM "tenants" t
WHERE NOT EXISTS (
  SELECT 1 FROM "pipelines" p
  WHERE p."tenant_id" = t."id" AND p."type" = 'NEW_SALES' AND p."deleted_at" IS NULL
);

-- Remarketing (REMARKETING)
INSERT INTO "pipelines" (
  "pipeline_id", "tenant_id", "name", "type", "stages",
  "closed_won_stage_name", "closed_lost_stage_name", "is_default",
  "created_at", "updated_at"
)
SELECT
  gen_random_uuid()::text, t."id", 'Remarketing', 'REMARKETING'::"PipelineType",
  jsonb_build_array(
    jsonb_build_object('id', gen_random_uuid()::text, 'name', 'Follow-up Due', 'order', 1),
    jsonb_build_object('id', gen_random_uuid()::text, 'name', 'Nurturing',     'order', 2),
    jsonb_build_object('id', gen_random_uuid()::text, 'name', 'Re-engaged',    'order', 3),
    jsonb_build_object('id', gen_random_uuid()::text, 'name', 'Offer Sent',    'order', 4),
    jsonb_build_object('id', gen_random_uuid()::text, 'name', 'Closed Won',    'order', 5),
    jsonb_build_object('id', gen_random_uuid()::text, 'name', 'Closed Lost',   'order', 6)
  ),
  'Closed Won', 'Closed Lost', false, now(), now()
FROM "tenants" t
WHERE NOT EXISTS (
  SELECT 1 FROM "pipelines" p
  WHERE p."tenant_id" = t."id" AND p."type" = 'REMARKETING' AND p."deleted_at" IS NULL
);

-- Repurchasing (REPURCHASE)
INSERT INTO "pipelines" (
  "pipeline_id", "tenant_id", "name", "type", "stages",
  "closed_won_stage_name", "closed_lost_stage_name", "is_default",
  "created_at", "updated_at"
)
SELECT
  gen_random_uuid()::text, t."id", 'Repurchasing', 'REPURCHASE'::"PipelineType",
  jsonb_build_array(
    jsonb_build_object('id', gen_random_uuid()::text, 'name', 'Existing Customer', 'order', 1),
    jsonb_build_object('id', gen_random_uuid()::text, 'name', 'Needs Review',      'order', 2),
    jsonb_build_object('id', gen_random_uuid()::text, 'name', 'Offer Sent',        'order', 3),
    jsonb_build_object('id', gen_random_uuid()::text, 'name', 'Negotiating',       'order', 4),
    jsonb_build_object('id', gen_random_uuid()::text, 'name', 'Closed Won',        'order', 5),
    jsonb_build_object('id', gen_random_uuid()::text, 'name', 'Closed Lost',       'order', 6)
  ),
  'Closed Won', 'Closed Lost', false, now(), now()
FROM "tenants" t
WHERE NOT EXISTS (
  SELECT 1 FROM "pipelines" p
  WHERE p."tenant_id" = t."id" AND p."type" = 'REPURCHASE' AND p."deleted_at" IS NULL
);

-- 2. Make Sales (NEW_SALES) the default for every tenant; clear it elsewhere. --
-- Pick exactly one NEW_SALES pipeline per tenant (oldest), flag it default, and
-- unset is_default on all other pipelines for that tenant — so a previous custom
-- default (e.g. "p") is demoted.
WITH sales_default AS (
  SELECT DISTINCT ON (p."tenant_id") p."pipeline_id"
  FROM "pipelines" p
  WHERE p."type" = 'NEW_SALES' AND p."deleted_at" IS NULL
  ORDER BY p."tenant_id", p."created_at" ASC, p."pipeline_id" ASC
)
UPDATE "pipelines" tgt
SET "is_default" = (tgt."pipeline_id" IN (SELECT "pipeline_id" FROM sales_default)),
    "updated_at" = now()
WHERE tgt."deleted_at" IS NULL
  AND tgt."tenant_id" IN (
    SELECT p2."tenant_id" FROM "pipelines" p2
    WHERE p2."type" = 'NEW_SALES' AND p2."deleted_at" IS NULL
  );
