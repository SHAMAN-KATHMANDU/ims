import { Queue } from "bullmq";
import { redisConnection } from "./queue.config";

export interface AutomationEventJobData {
  eventId: string;
}

export const automationEventQueue = new Queue<AutomationEventJobData>(
  "automation-events",
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86400 },
    },
  },
);
