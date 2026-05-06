-- Phase 5 — Reusable block sub-trees ("snippets" / "symbols").
--
-- Tenants store named BlockNode[] sub-trees here and reference them from
-- any page/post body via a `snippet-ref` block. The tenant-site renderer
-- dereferences at request time, with a hard depth cap to defend against
-- cycles.

-- CreateTable
CREATE TABLE "site_snippets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "category" VARCHAR(60),
    "body" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_snippets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "site_snippets_tenant_id_slug_key"
    ON "site_snippets"("tenant_id", "slug");
CREATE INDEX "site_snippets_tenant_id_updated_at_idx"
    ON "site_snippets"("tenant_id", "updated_at");

-- AddForeignKey
ALTER TABLE "site_snippets"
    ADD CONSTRAINT "site_snippets_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
