-- Issue #537: add soft-delete tombstone to users so deleting an account
-- archives it (preserving onDelete: Restrict references on contacts/deals/leads/...)
-- and hides it from the admin list and login.
ALTER TABLE "users" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- Tenant-scoped index for the list query that filters on deletedAt.
CREATE INDEX "users_tenant_id_deleted_at_idx" ON "users"("tenant_id", "deleted_at");
