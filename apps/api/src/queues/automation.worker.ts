import { Worker } from "bullmq";
import { logger } from "@/config/logger";
import { processAutomationEventById } from "@/modules/automation/automation.runtime";
import { redisConnection } from "./queue.config";
import type { AutomationEventJobData } from "./automation-queue";

const automationWorker = new Worker<AutomationEventJobData>(
  "automation-events",
  async (job) => {
    await processAutomationEventById(job.data.eventId);
  },
  {
    connection: redisConnection,
    concurrency: 5,
  },
);

automationWorker.on("failed", (job, err) => {
  logger.error("Automation event job failed", undefined, {
    jobId: job?.id,
    eventId: job?.data?.eventId,
    error: err.message,
  });
});

export default automationWorker;
