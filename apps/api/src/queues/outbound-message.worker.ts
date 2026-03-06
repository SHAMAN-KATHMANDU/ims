import { Worker, Job } from "bullmq";
import { redisConnection } from "./queue.config";
import { basePrisma } from "@/config/prisma";
import { getProvider } from "@/providers/provider-factory";
import { decrypt } from "@/utils/encryption";
import { getIO } from "@/config/socket.config";
import { logger } from "@/config/logger";

interface OutboundJobData {
  messageId: string;
  conversationId: string;
  channelId: string;
}

const outboundWorker = new Worker<OutboundJobData>(
  "messaging:outbound",
  async (job: Job<OutboundJobData>) => {
    const { messageId, conversationId, channelId } = job.data;

    // Load message, conversation, and channel
    const message = await basePrisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message) {
      logger.warn(`[OutboundWorker] Message ${messageId} not found`);
      return;
    }

    const conversation = await basePrisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) {
      logger.warn(`[OutboundWorker] Conversation ${conversationId} not found`);
      return;
    }

    const channel = await basePrisma.messagingChannel.findUnique({
      where: { id: channelId },
    });
    if (!channel) {
      logger.warn(`[OutboundWorker] Channel ${channelId} not found`);
      return;
    }

    // Decrypt credentials and send
    const credentials = JSON.parse(decrypt(channel.credentialsEnc));
    const provider = getProvider(channel.provider);

    try {
      const result = await provider.sendMessage(credentials, {
        recipientId: conversation.participantId,
        text: message.textContent || undefined,
        mediaUrl: (message.mediaPayload as any)?.url,
        mediaType: (message.mediaPayload as any)?.type,
      });

      // Update message status to SENT
      await basePrisma.message.update({
        where: { id: messageId },
        data: {
          status: "SENT",
          providerMessageId: result.providerMessageId,
          sentAt: new Date(),
        },
      });

      // Update conversation
      await basePrisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: new Date(),
          lastMessageText:
            message.textContent?.substring(0, 500) || "Media message",
        },
      });

      // Emit status update
      const io = getIO();
      if (io) {
        io.to(`tenant:${conversation.tenantId}`).emit(
          "messaging:message-status",
          {
            messageId,
            status: "SENT",
            sentAt: new Date(),
          },
        );
      }
    } catch (error: any) {
      logger.error(
        `[OutboundWorker] Send failed for message ${messageId}: ${error.message}`,
      );

      // If max retries exhausted, mark as FAILED
      if (job.attemptsMade >= (job.opts.attempts || 5) - 1) {
        await basePrisma.message.update({
          where: { id: messageId },
          data: {
            status: "FAILED",
            errorDetails: {
              message: error.message,
              attempt: job.attemptsMade + 1,
            },
          },
        });

        const io = getIO();
        if (io) {
          io.to(`tenant:${conversation.tenantId}`).emit(
            "messaging:message-status",
            {
              messageId,
              status: "FAILED",
            },
          );
        }
      }

      throw error; // Re-throw for BullMQ retry
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  },
);

outboundWorker.on("failed", (job, err) => {
  logger.error(`[OutboundWorker] Job ${job?.id} failed: ${err.message}`);
});

export default outboundWorker;
