import { Job, Worker } from "bullmq";
import { redisConnection } from "./queue.config";
import { logger } from "@/config/logger";
import aiReplyService from "@/services/ai-replies/ai-reply.service";

interface AiReplyJobData {
  tenantId: string;
  conversationId: string;
  inboundMessageId: string;
  providerEventId: string;
}

const aiReplyWorker = new Worker<AiReplyJobData>(
  "messaging-ai-reply",
  async (job: Job<AiReplyJobData>) => {
    await aiReplyService.processInboundMessage(job.data);
  },
  {
    connection: redisConnection,
    concurrency: 5,
  },
);

aiReplyWorker.on("failed", (job, err) => {
  logger.error(`[AiReplyWorker] Job ${job?.id} failed: ${err.message}`);
});

export default aiReplyWorker;
