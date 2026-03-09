-- AlterTable
ALTER TABLE "tenants" ADD COLUMN "custom_max_users" INTEGER;
ALTER TABLE "tenants" ADD COLUMN "custom_max_products" INTEGER;
ALTER TABLE "tenants" ADD COLUMN "custom_max_locations" INTEGER;
ALTER TABLE "tenants" ADD COLUMN "custom_max_members" INTEGER;
ALTER TABLE "tenants" ADD COLUMN "custom_max_customers" INTEGER;
