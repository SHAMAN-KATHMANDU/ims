-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "delete_reason" VARCHAR(500),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "delete_reason" VARCHAR(500),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "delete_reason" VARCHAR(500),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "delete_reason" VARCHAR(500),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "delete_reason" VARCHAR(500),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "delete_reason" VARCHAR(500),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "locations" ADD COLUMN     "delete_reason" VARCHAR(500),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "delete_reason" VARCHAR(500),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "pipelines" ADD COLUMN     "delete_reason" VARCHAR(500),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "delete_reason" VARCHAR(500),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "promo_codes" ADD COLUMN     "delete_reason" VARCHAR(500),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "sub_categories" ADD COLUMN     "delete_reason" VARCHAR(500),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "delete_reason" VARCHAR(500),
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "delete_reason" VARCHAR(500),
ADD COLUMN     "deleted_by" TEXT;
