-- Phase 6 — Review workflow + inline block comments.
--
-- Two additions:
--   1. `review_status` column on blog_posts + tenant_pages (DRAFT default)
--      with a new ReviewStatus enum.
--   2. block_comments table — polymorphic over BLOG_POST / TENANT_PAGE,
--      optional per-block anchoring via blockId, threading via parentId.
--
-- Behind CMS_REVIEW_WORKFLOW env flag in the API + admin UI; the schema
-- additions are forward-compatible (default DRAFT for review_status,
-- empty comments table).

-- CreateEnum
CREATE TYPE "content_review_status" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "BlockCommentRecordType" AS ENUM ('BLOG_POST', 'TENANT_PAGE');

-- AlterTable
ALTER TABLE "blog_posts"
  ADD COLUMN "review_status" "content_review_status" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "tenant_pages"
  ADD COLUMN "review_status" "content_review_status" NOT NULL DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "block_comments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "record_type" "BlockCommentRecordType" NOT NULL,
    "record_id" TEXT NOT NULL,
    "block_id" TEXT,
    "body" VARCHAR(2000) NOT NULL,
    "author_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "block_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "block_comments_tenant_id_record_type_record_id_created_at_idx"
    ON "block_comments"("tenant_id", "record_type", "record_id", "created_at");
CREATE INDEX "block_comments_tenant_id_record_type_record_id_block_id_idx"
    ON "block_comments"("tenant_id", "record_type", "record_id", "block_id");
CREATE INDEX "block_comments_tenant_id_author_id_idx"
    ON "block_comments"("tenant_id", "author_id");

-- AddForeignKey
ALTER TABLE "block_comments"
    ADD CONSTRAINT "block_comments_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "block_comments"
    ADD CONSTRAINT "block_comments_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "block_comments"
    ADD CONSTRAINT "block_comments_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "block_comments"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
