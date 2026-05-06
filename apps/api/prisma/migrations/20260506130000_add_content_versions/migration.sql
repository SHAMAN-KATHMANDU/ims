-- Phase 4 — Content versioning.
--
-- Adds three immutable snapshot tables: blog_post_versions,
-- tenant_page_versions, site_layout_versions. Each row captures the
-- full state of its parent at a point in time as JSONB. The API caps
-- each parent at 50 versions by deleting the oldest in the same
-- transaction that writes a new one.

-- CreateTable
CREATE TABLE "blog_post_versions" (
    "id" TEXT NOT NULL,
    "blog_post_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "editor_id" TEXT,
    "note" VARCHAR(280),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_post_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_page_versions" (
    "id" TEXT NOT NULL,
    "tenant_page_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "editor_id" TEXT,
    "note" VARCHAR(280),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_page_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_layout_versions" (
    "id" TEXT NOT NULL,
    "site_layout_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "editor_id" TEXT,
    "note" VARCHAR(280),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_layout_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blog_post_versions_blog_post_id_created_at_idx"
    ON "blog_post_versions"("blog_post_id", "created_at");
CREATE INDEX "blog_post_versions_tenant_id_created_at_idx"
    ON "blog_post_versions"("tenant_id", "created_at");

CREATE INDEX "tenant_page_versions_tenant_page_id_created_at_idx"
    ON "tenant_page_versions"("tenant_page_id", "created_at");
CREATE INDEX "tenant_page_versions_tenant_id_created_at_idx"
    ON "tenant_page_versions"("tenant_id", "created_at");

CREATE INDEX "site_layout_versions_site_layout_id_created_at_idx"
    ON "site_layout_versions"("site_layout_id", "created_at");
CREATE INDEX "site_layout_versions_tenant_id_created_at_idx"
    ON "site_layout_versions"("tenant_id", "created_at");

-- AddForeignKey
ALTER TABLE "blog_post_versions"
    ADD CONSTRAINT "blog_post_versions_blog_post_id_fkey"
    FOREIGN KEY ("blog_post_id") REFERENCES "blog_posts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_page_versions"
    ADD CONSTRAINT "tenant_page_versions_tenant_page_id_fkey"
    FOREIGN KEY ("tenant_page_id") REFERENCES "tenant_pages"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "site_layout_versions"
    ADD CONSTRAINT "site_layout_versions_site_layout_id_fkey"
    FOREIGN KEY ("site_layout_id") REFERENCES "site_layouts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
