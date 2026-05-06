/**
 * Backfill `BlogPost.body` and `TenantPage.body` from `bodyMarkdown`.
 *
 * Phase 2 introduced a JSONB `body` column on both models that stores the
 * canonical block tree. New rows default to an empty array (`[]`) which
 * the renderer treats as "no block body — fall back to bodyMarkdown".
 * This script populates `body` on existing rows so they participate in
 * the block-based editor immediately, by wrapping their existing
 * markdown in a single `markdown-body` block.
 *
 * Idempotent — rows whose `body` is already non-empty are skipped, so
 * this can be re-run safely after deploy.
 *
 * Intentionally NOT wired into `prisma/seed.ts` (which is dev-destructive).
 * Run it manually after applying the Phase 2 migration:
 *
 *   npx tsx apps/api/prisma/scripts/backfill-content-body.ts
 *
 * Phase 3 (Notion-style editor) will replace the markdown-body block
 * with a richer per-element block tree on first edit; until then this
 * keeps the existing markdown intact.
 */

import { PrismaClient } from "@prisma/client";

interface MarkdownBodyBlock {
  id: string;
  kind: "markdown-body";
  props: { source: string };
}

function wrap(markdown: string): MarkdownBodyBlock[] {
  if (!markdown || markdown.trim().length === 0) return [];
  return [
    {
      id: "md-1",
      kind: "markdown-body",
      props: { source: markdown },
    },
  ];
}

function isEmptyBody(value: unknown): boolean {
  // Postgres JSONB default of `[]` decodes as an empty array; rows that
  // have already been migrated will have at least one block in the array.
  if (Array.isArray(value)) return value.length === 0;
  // Defensive: anything else (null, object, string) is treated as "needs
  // backfill" — the migration column is `JSONB NOT NULL DEFAULT '[]'` so
  // this branch should not normally fire.
  return true;
}

async function backfillBlogPosts(prisma: PrismaClient): Promise<number> {
  const posts = await prisma.blogPost.findMany({
    select: { id: true, body: true, bodyMarkdown: true },
  });
  let updated = 0;
  for (const p of posts) {
    if (!isEmptyBody(p.body)) continue;
    const blocks = wrap(p.bodyMarkdown);
    if (blocks.length === 0) continue; // empty markdown → leave body empty
    await prisma.blogPost.update({
      where: { id: p.id },
      data: { body: blocks as object },
    });
    updated += 1;
  }
  return updated;
}

async function backfillTenantPages(prisma: PrismaClient): Promise<number> {
  const pages = await prisma.tenantPage.findMany({
    select: { id: true, body: true, bodyMarkdown: true },
  });
  let updated = 0;
  for (const p of pages) {
    if (!isEmptyBody(p.body)) continue;
    const blocks = wrap(p.bodyMarkdown);
    if (blocks.length === 0) continue;
    await prisma.tenantPage.update({
      where: { id: p.id },
      data: { body: blocks as object },
    });
    updated += 1;
  }
  return updated;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const blogUpdated = await backfillBlogPosts(prisma);
    const pagesUpdated = await backfillTenantPages(prisma);
    // eslint-disable-next-line no-console
    console.log(
      `[backfill-content-body] blog_posts: ${blogUpdated} updated · tenant_pages: ${pagesUpdated} updated`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[backfill-content-body] failed:", err);
  process.exitCode = 1;
});
