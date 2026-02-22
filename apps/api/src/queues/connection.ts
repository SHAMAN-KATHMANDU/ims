import { Queue, Worker, JobsOptions, Processor } from "bullmq";
import { env } from "@/config/env";

const connection = env.redisUrl
  ? {
      url: env.redisUrl,
      maxRetriesPerRequest: null as null,
    }
  : null;

export function canUseQueues(): boolean {
  return Boolean(connection);
}

export function createQueue(name: string): Queue | null {
  if (!connection) return null;
  return new Queue(name, { connection });
}

export function createWorker(
  name: string,
  processor: Processor<any, any, string>,
): Worker | null {
  if (!connection) return null;
  return new Worker(name, processor, { connection });
}

export async function enqueueJob(
  queue: Queue | null,
  jobName: string,
  data: Record<string, unknown>,
  opts?: JobsOptions,
): Promise<void> {
  if (!queue) return;
  await queue.add(jobName, data, opts);
}
