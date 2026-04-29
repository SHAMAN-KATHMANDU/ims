-- CreateTable
CREATE TABLE "tenant_redirects" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "from_path" VARCHAR(500) NOT NULL,
    "to_path" VARCHAR(500) NOT NULL,
    "status_code" INTEGER NOT NULL DEFAULT 301,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_redirects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_redirects_tenant_id_from_path_key" ON "tenant_redirects"("tenant_id", "from_path");

-- CreateIndex
CREATE INDEX "tenant_redirects_tenant_id_is_active_idx" ON "tenant_redirects"("tenant_id", "is_active");

-- AddForeignKey
ALTER TABLE "tenant_redirects" ADD CONSTRAINT "tenant_redirects_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
