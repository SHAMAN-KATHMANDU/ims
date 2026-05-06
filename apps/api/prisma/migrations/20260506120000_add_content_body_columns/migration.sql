-- Phase 2 — Block-based content bodies + scheduled publishing.
--
-- Adds two columns to BlogPost and TenantPage:
--   * body                 jsonb default '[]'  — BlockNode[] (canonical body).
--   * scheduled_publish_at timestamptz null     — Phase 4 scheduler input.
--
-- bodyMarkdown stays in place; the API derives it from `body` server-side
-- via blocksToMarkdown() so RSS / SEO / legacy renderers keep working
-- unchanged. New rows default to an empty tree; existing rows are
-- backfilled with a single markdown-body block via
-- prisma/scripts/backfill-content-body.ts (run after this migration).

-- AlterTable
ALTER TABLE "blog_posts"
  ADD COLUMN "body" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "scheduled_publish_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_pages"
  ADD COLUMN "body" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "scheduled_publish_at" TIMESTAMP(3);

-- Index for the scheduler worker — Phase 4 will scan this regularly.
CREATE INDEX "blog_posts_scheduled_publish_at_idx"
  ON "blog_posts"("scheduled_publish_at")
  WHERE "scheduled_publish_at" IS NOT NULL;

CREATE INDEX "tenant_pages_scheduled_publish_at_idx"
  ON "tenant_pages"("scheduled_publish_at")
  WHERE "scheduled_publish_at" IS NOT NULL;
