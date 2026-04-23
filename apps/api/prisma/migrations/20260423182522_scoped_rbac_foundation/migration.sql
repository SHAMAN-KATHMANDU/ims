-- CreateEnum
CREATE TYPE "resource_type" AS ENUM ('WORKSPACE', 'PRODUCT', 'CATEGORY', 'VENDOR', 'LOCATION', 'TRANSFER', 'BUNDLE', 'GIFT_CARD', 'PROMO', 'COLLECTION', 'ATTRIBUTE_TYPE', 'DISCOUNT', 'SALE', 'WEBSITE_ORDER', 'ABANDONED_CART', 'CONTACT', 'COMPANY', 'LEAD', 'DEAL', 'PIPELINE', 'WORKFLOW', 'TASK', 'ACTIVITY', 'AUTOMATION', 'REMARKETING_CAMPAIGN', 'CONTACT_NOTE', 'BLOG_POST', 'PAGE', 'SITE', 'MEDIA', 'REVIEW', 'NAV_MENU', 'REPORT', 'DASHBOARD', 'CUSTOM_REPORT', 'USER', 'ROLE', 'MEMBER', 'AUDIT_LOG', 'TRASH_ITEM', 'AI_SETTING', 'WEBHOOK', 'API_KEY', 'INTEGRATION');

-- CreateEnum
CREATE TYPE "overwrite_subject_type" AS ENUM ('ROLE', 'USER');

-- CreateTable
CREATE TABLE "rbac_roles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "permissions" BYTEA NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "color" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rbac_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" "resource_type" NOT NULL,
    "external_id" VARCHAR(36) NOT NULL,
    "parent_id" TEXT,
    "path" TEXT NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_overwrites" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "subject_type" "overwrite_subject_type" NOT NULL,
    "role_id" TEXT,
    "user_id" TEXT,
    "allow" BYTEA NOT NULL,
    "deny" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permission_overwrites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rbac_roles_tenant_id_is_system_idx" ON "rbac_roles"("tenant_id", "is_system");

-- CreateIndex
CREATE INDEX "rbac_roles_tenant_id_priority_idx" ON "rbac_roles"("tenant_id", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "rbac_roles_tenant_id_name_key" ON "rbac_roles"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "user_roles_tenant_id_user_id_idx" ON "user_roles"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "user_roles_tenant_id_role_id_idx" ON "user_roles"("tenant_id", "role_id");

-- CreateIndex
CREATE INDEX "resources_tenant_id_type_idx" ON "resources"("tenant_id", "type");

-- CreateIndex
CREATE INDEX "resources_tenant_id_parent_id_idx" ON "resources"("tenant_id", "parent_id");

-- CreateIndex
CREATE INDEX "resources_tenant_id_depth_idx" ON "resources"("tenant_id", "depth");

-- CreateIndex
CREATE UNIQUE INDEX "resources_tenant_id_external_id_key" ON "resources"("tenant_id", "external_id");

-- CreateIndex
CREATE INDEX "permission_overwrites_tenant_id_resource_id_idx" ON "permission_overwrites"("tenant_id", "resource_id");

-- CreateIndex
CREATE INDEX "permission_overwrites_tenant_id_role_id_idx" ON "permission_overwrites"("tenant_id", "role_id");

-- CreateIndex
CREATE INDEX "permission_overwrites_tenant_id_user_id_idx" ON "permission_overwrites"("tenant_id", "user_id");

-- AddForeignKey
ALTER TABLE "rbac_roles" ADD CONSTRAINT "rbac_roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "rbac_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_overwrites" ADD CONSTRAINT "permission_overwrites_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_overwrites" ADD CONSTRAINT "permission_overwrites_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_overwrites" ADD CONSTRAINT "permission_overwrites_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "rbac_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_overwrites" ADD CONSTRAINT "permission_overwrites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- RBAC Constraints (enforced at database level)
-- ============================================

-- XOR constraint: exactly one of roleId or userId must be set
ALTER TABLE "permission_overwrites"
ADD CONSTRAINT "permission_overwrite_xor_subject"
CHECK (
  (("role_id" IS NOT NULL)::INT + ("user_id" IS NOT NULL)::INT) = 1
);

-- CHECK constraint: permissions, allow, deny must be exactly 64 bytes
ALTER TABLE "rbac_roles"
ADD CONSTRAINT "rbac_roles_permissions_length"
CHECK (octet_length("permissions") = 64);

ALTER TABLE "permission_overwrites"
ADD CONSTRAINT "permission_overwrite_allow_length"
CHECK (octet_length("allow") = 64);

ALTER TABLE "permission_overwrites"
ADD CONSTRAINT "permission_overwrite_deny_length"
CHECK (octet_length("deny") = 64);

-- Partial unique indexes (XOR safety: enforce uniqueness per subject type)
CREATE UNIQUE INDEX "permission_overwrites_role_unique"
ON "permission_overwrites"("tenant_id", "resource_id", "role_id")
WHERE "subject_type" = 'ROLE';

CREATE UNIQUE INDEX "permission_overwrites_user_unique"
ON "permission_overwrites"("tenant_id", "resource_id", "user_id")
WHERE "subject_type" = 'USER';
