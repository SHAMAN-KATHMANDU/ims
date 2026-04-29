import { Queue } from "bullmq";
import { env } from "@/config/env";

/**
 * Shared Redis connection config for all BullMQ queues/workers.
 * BullMQ accepts either a live ioredis instance or connection options.
 * We use connection options for compatibility with cluster mode.
 */
const redisUrl = new URL(env.redisUrl);
export const redisConnection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port) || 6379,
  password: redisUrl.password || undefined,
  maxRetriesPerRequest: null,
};

/**
 * Inbound messaging queue - processes incoming messages from external channels.
 */
export const inboundQueue = new Queue("messaging-inbound", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: {
      age: 86400, // 24 hours
    },
    removeOnFail: {
      age: 604800, // 7 days
    },
  },
});

/**
 * Outbound messaging queue - processes messages to be sent to external channels.
 */
export const outboundQueue = new Queue("messaging-outbound", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: {
      age: 86400, // 24 hours
    },
    removeOnFail: {
      age: 604800, // 7 days
    },
  },
});

/**
 * Status queue - processes delivery status updates and read receipts.
 */
export const statusQueue = new Queue("messaging-status", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 500,
    },
    removeOnComplete: {
      age: 3600, // 1 hour
    },
    removeOnFail: {
      age: 86400, // 24 hours
    },
  },
});

/**
 * AI reply queue - generates optional automated responses for inbound messages.
 */
export const aiReplyQueue = new Queue("messaging-ai-reply", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: {
      age: 86400, // 24 hours
    },
    removeOnFail: {
      age: 604800, // 7 days
    },
  },
});

/**
 * Form-submission email queue — sends notification emails when a tenant-site
 * form block is submitted with submitTo='email'.
 *
 * Retry policy: 3 attempts, exponential back-off starting at 5 s.
 * A unique jobId per submission prevents duplicate sends on HTTP retries.
 */
export const formSubmissionEmailQueue = new Queue("form-submission-email", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      age: 86400, // 24 hours
    },
    removeOnFail: {
      age: 604800, // 7 days
    },
  },
});
