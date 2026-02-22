import { logger } from "@/config/logger";
import { createQueue, createWorker, enqueueJob } from "@/queues/connection";
import { runTrashCleanup } from "@/jobs/trashCleanup";

const QUEUE_NAME = "maintenance";
const JOB_NAME = "trash-cleanup";
const maintenanceQueue = createQueue(QUEUE_NAME);

export async function enqueueTrashCleanup(): Promise<void> {
  if (!maintenanceQueue) {
    await runTrashCleanup();
    return;
  }
  await enqueueJob(
    maintenanceQueue,
    JOB_NAME,
    {},
    {
      removeOnComplete: true,
      removeOnFail: 50,
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
    },
  );
}

export function startMaintenanceWorker(): void {
  const worker = createWorker(QUEUE_NAME, async (job) => {
    if (job.name === JOB_NAME) {
      await runTrashCleanup();
    }
  });

  if (!worker) {
    logger.log("[Queue] Redis unavailable; maintenance worker disabled");
    return;
  }

  worker.on("failed", (job, error) => {
    logger.error("[Queue] Maintenance job failed", {
      jobId: job?.id,
      name: job?.name,
      error: String(error),
    });
  });
}
