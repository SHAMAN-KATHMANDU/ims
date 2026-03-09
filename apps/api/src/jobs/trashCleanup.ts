/**
 * Trash cleanup job: permanently deletes items that have been in trash for 30+ days.
 * Runs daily at 3:00 AM.
 */

import cron from "node-cron";
import { basePrisma } from "@/config/prisma";
import { logger } from "@/config/logger";

const TRASH_RETENTION_DAYS = 30;

const TRASHED_MODELS = [
  "product",
  "category",
  "subCategory",
  "vendor",
  "member",
  "location",
  "promoCode",
  "company",
  "contact",
  "lead",
  "deal",
  "task",
  "activity",
  "pipeline",
] as const;

export function getCutoffDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() - TRASH_RETENTION_DAYS);
  return d;
}

export async function runTrashCleanup(): Promise<void> {
  const cutoff = getCutoffDate();
  logger.log(
    `[TrashCleanup] Running cleanup for items deleted before ${cutoff.toISOString()}`,
  );

  let totalDeleted = 0;

  for (const modelName of TRASHED_MODELS) {
    try {
      const delegate = (basePrisma as any)[modelName];
      if (!delegate) {
        logger.warn(`[TrashCleanup] Model ${modelName} not found, skipping`);
        continue;
      }

      const result = await delegate.deleteMany({
        where: {
          deletedAt: { lt: cutoff },
        },
      });

      const count = result?.count ?? 0;
      if (count > 0) {
        totalDeleted += count;
        logger.log(`[TrashCleanup] Deleted ${count} ${modelName}(s)`);
      }
    } catch (error) {
      logger.error(
        `[TrashCleanup] Error cleaning up ${modelName}`,
        undefined,
        error,
      );
    }
  }

  logger.log(
    `[TrashCleanup] Complete. Total permanently deleted: ${totalDeleted}`,
  );
}

export function startTrashCleanupCron(): void {
  cron.schedule("0 3 * * *", async () => {
    try {
      await runTrashCleanup();
    } catch (error) {
      logger.error("[TrashCleanup] Fatal error in cron job", undefined, error);
    }
  });

  logger.log("[TrashCleanup] Scheduled daily at 3:00 AM");
}
