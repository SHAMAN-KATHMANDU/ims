/**
 * Scheduled-publish worker.
 *
 * Every 5 minutes, scans BlogPost + TenantPage rows whose
 * `scheduledPublishAt` is in the past and that are still in DRAFT /
 * unpublished state, and runs the matching publish flow for each.
 *
 * Idempotent: every run hits the same publish flow used by the API
 * (publishPost / publishPage). The scheduler clears the
 * `scheduledPublishAt` column on success so a second pass over the same
 * row is a no-op even if a hiccup leaves the row in a paradoxical state.
 *
 * Runs in every API replica. The publish flows guard against double-
 * publishing (a re-publish of an already-PUBLISHED post just keeps it
 * published), so concurrent replicas can't double-fire harmfully.
 */

import cron from "node-cron";
import prisma from "@/config/prisma";
import { logger } from "@/config/logger";
import blogService from "@/modules/blog/blog.service";
import pagesService from "@/modules/pages/pages.service";

interface DueRow {
  id: string;
  tenantId: string;
}

/**
 * Find blog posts whose schedule is due. Runs in tenant-aware batches —
 * we process each row independently so a per-tenant failure doesn't
 * stall the whole sweep.
 */
async function findDueBlogPosts(now: Date): Promise<DueRow[]> {
  const rows = await prisma.blogPost.findMany({
    where: {
      scheduledPublishAt: { lte: now, not: null },
      status: { not: "PUBLISHED" },
    },
    select: { id: true, tenantId: true },
    take: 200, // safety cap; if there are more, we'll catch them next sweep
  });
  return rows;
}

async function findDueTenantPages(now: Date): Promise<DueRow[]> {
  const rows = await prisma.tenantPage.findMany({
    where: {
      scheduledPublishAt: { lte: now, not: null },
      isPublished: false,
    },
    select: { id: true, tenantId: true },
    take: 200,
  });
  return rows;
}

/**
 * Publish one blog post via the existing service flow, then clear its
 * scheduledPublishAt so it won't be picked up again.
 */
async function publishBlogPost(row: DueRow): Promise<void> {
  try {
    await blogService.publishPost(row.tenantId, row.id, null);
    await prisma.blogPost.update({
      where: { id: row.id },
      data: { scheduledPublishAt: null },
    });
    logger.log(
      `[ScheduledPublish] Published BlogPost ${row.id} (tenant ${row.tenantId})`,
    );
  } catch (error) {
    logger.error(
      `[ScheduledPublish] Failed to publish BlogPost ${row.id}`,
      undefined,
      error,
    );
  }
}

async function publishTenantPage(row: DueRow): Promise<void> {
  try {
    await pagesService.publishPage(row.tenantId, row.id, null);
    await prisma.tenantPage.update({
      where: { id: row.id },
      data: { scheduledPublishAt: null },
    });
    logger.log(
      `[ScheduledPublish] Published TenantPage ${row.id} (tenant ${row.tenantId})`,
    );
  } catch (error) {
    logger.error(
      `[ScheduledPublish] Failed to publish TenantPage ${row.id}`,
      undefined,
      error,
    );
  }
}

/**
 * One scheduler sweep. Exported for tests / manual triggers.
 */
export async function runScheduledPublishSweep(
  now: Date = new Date(),
): Promise<{
  blogPostsPublished: number;
  pagesPublished: number;
}> {
  const [blogRows, pageRows] = await Promise.all([
    findDueBlogPosts(now),
    findDueTenantPages(now),
  ]);

  for (const row of blogRows) await publishBlogPost(row);
  for (const row of pageRows) await publishTenantPage(row);

  if (blogRows.length > 0 || pageRows.length > 0) {
    logger.log(
      `[ScheduledPublish] Sweep complete: ${blogRows.length} post(s), ${pageRows.length} page(s)`,
    );
  }

  return {
    blogPostsPublished: blogRows.length,
    pagesPublished: pageRows.length,
  };
}

/**
 * Schedule the cron. Cadence: every 5 minutes. The job is in-process —
 * deployed to every API replica. The publish flow is idempotent so
 * concurrent replicas are safe.
 */
export function startScheduledPublishCron(): void {
  cron.schedule("*/5 * * * *", async () => {
    try {
      await runScheduledPublishSweep();
    } catch (error) {
      logger.error(
        "[ScheduledPublish] Fatal error in cron job",
        undefined,
        error,
      );
    }
  });
  logger.log("[ScheduledPublish] Scheduled every 5 minutes");
}
