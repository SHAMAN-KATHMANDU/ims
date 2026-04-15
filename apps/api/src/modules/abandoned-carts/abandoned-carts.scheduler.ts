/**
 * Abandoned-cart scheduler.
 *
 * Runs the sweep every 15 minutes. Mirrored after
 * `remarketing.scheduler.ts` — single scheduled task, safe re-entry,
 * stoppable for tests. No per-tenant state.
 */

import cron, { type ScheduledTask } from "node-cron";
import { logger } from "@/config/logger";
import abandonedCartsService from "./abandoned-carts.service";

let scheduledTask: ScheduledTask | null = null;

export function startAbandonedCartScheduler() {
  if (scheduledTask) {
    logger.info("Abandoned-cart scheduler already running");
    return;
  }

  // Every 15 minutes. A 30-min idle threshold means the worst-case
  // delay between drop-off and event is ~45 min, which is fine —
  // remarketing is not a real-time problem.
  scheduledTask = cron.schedule("*/15 * * * *", async () => {
    try {
      const result = await abandonedCartsService.sweepAbandonedCarts();
      if (result.found > 0 || result.purged > 0) {
        logger.info("Abandoned-cart sweep complete", undefined, {
          found: result.found,
          fired: result.fired,
          purged: result.purged,
        });
      }
    } catch (err) {
      logger.error("Abandoned-cart scheduler: failed", undefined, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  logger.info("Abandoned-cart scheduler started (runs every 15 minutes)");
}

export function stopAbandonedCartScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    logger.info("Abandoned-cart scheduler stopped");
  }
}
