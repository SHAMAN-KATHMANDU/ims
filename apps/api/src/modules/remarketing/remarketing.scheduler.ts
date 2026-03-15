import cron, { type ScheduledTask } from "node-cron";
import { logger } from "@/config/logger";
import remarketingService from "./remarketing.service";

let scheduledTask: ScheduledTask | null = null;

/**
 * Start the remarketing sequence processor.
 * Runs every hour to check for pending sequences that are due.
 */
export function startRemarketingScheduler() {
  if (scheduledTask) {
    logger.info("Remarketing scheduler already running");
    return;
  }

  scheduledTask = cron.schedule("0 * * * *", async () => {
    logger.info("Remarketing scheduler: processing pending sequences");
    try {
      const result = await remarketingService.processPendingSequences();
      if (result.total > 0) {
        logger.info("Remarketing scheduler: batch complete", undefined, {
          executed: result.executed,
          paused: result.paused,
          total: result.total,
        });
      }
    } catch (err) {
      logger.error("Remarketing scheduler: failed", undefined, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  logger.info("Remarketing scheduler started (runs every hour)");
}

export function stopRemarketingScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    logger.info("Remarketing scheduler stopped");
  }
}
