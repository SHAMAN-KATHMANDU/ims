-- CreateTable
CREATE TABLE "pipeline_stages" (
    "pipeline_stage_id" TEXT NOT NULL,
    "pipeline_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "probability" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("pipeline_stage_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_stages_pipeline_id_name_key" ON "pipeline_stages"("pipeline_id", "name");

-- CreateIndex
CREATE INDEX "pipeline_stages_pipeline_id_order_idx" ON "pipeline_stages"("pipeline_id", "order");

-- AddForeignKey
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "pipelines"("pipeline_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Make stages column nullable for migration period
ALTER TABLE "pipelines" ALTER COLUMN "stages" DROP NOT NULL;
