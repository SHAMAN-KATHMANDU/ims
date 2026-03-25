-- AlterTable
ALTER TABLE "pipelines" ADD COLUMN     "closed_lost_stage_name" VARCHAR(100),
ADD COLUMN     "closed_won_stage_name" VARCHAR(100);
