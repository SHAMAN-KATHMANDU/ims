-- Drop deprecated stages JSON column from pipelines; use pipeline_stages table only.
ALTER TABLE "pipelines" DROP COLUMN IF EXISTS "stages";
