import { Worker, Job } from "bullmq";
import { redisConnection } from "./queue.config";
import { basePrisma } from "@/config/prisma";
import { getIO } from "@/config/socket.config";
import { logger } from "@/config/logger";
import type { MessagingProvider } from "@prisma/client";
import type { NormalizedInboundEvent } from "@/providers/messaging-provider.interface";

interface StatusJobData {
  provider: MessagingProvider;
  event: NormalizedInboundEvent;
}

const statusWorker = new Worker<StatusJobData>(
  "messaging-status",
  async (job: Job<StatusJobData>) => {
    const { event } = job.data;

    // Deduplication
    const existing = await basePrisma.webhookEvent.findUnique({
      where: { providerEventId: event.providerEventId },
    });
    if (existing) return;

    if (event.eventType === "delivery" && event.delivery) {
      for (const mid of event.delivery.providerMessageIds) {
        const message = await basePrisma.message.findFirst({
          where: { providerMessageId: mid },
          include: { conversation: { select: { tenantId: true } } },
        });
        if (message && message.status !== "READ") {
          await basePrisma.message.update({
            where: { id: message.id },
            data: {
              status: "DELIVERED",
              deliveredAt: new Date(event.timestamp),
            },
          });

          const io = getIO();
          if (io) {
            io.to(`tenant:${message.conversation.tenantId}`).emit(
              "messaging:message-status",
              {
                messageId: message.id,
                conversationId: message.conversationId,
                status: "DELIVERED",
                deliveredAt: new Date(event.timestamp),
              },
            );
          }
        }
      }
    } else if (event.eventType === "read" && event.read) {
      // Mark all messages sent before the watermark as READ
      const watermarkDate = new Date(event.read.watermark);

      // Find the channel to scope the query
      const channel = await basePrisma.messagingChannel.findUnique({
        where: {
          provider_externalId: {
            provider: job.data.provider,
            externalId: event.externalId,
          },
        },
      });
      if (!channel) return;

      const conversation = await basePrisma.conversation.findFirst({
        where: { channelId: channel.id, participantId: event.participantId },
      });
      if (!conversation) return;

      await basePrisma.message.updateMany({
        where: {
          conversationId: conversation.id,
          direction: "OUTBOUND",
          status: { in: ["SENT", "DELIVERED"] },
          sentAt: { lte: watermarkDate },
        },
        data: {
          status: "READ",
          readAt: watermarkDate,
        },
      });

      const io = getIO();
      if (io) {
        io.to(`tenant:${conversation.tenantId}`).emit(
          "messaging:message-status",
          {
            conversationId: conversation.id,
            status: "READ",
            readAt: watermarkDate,
          },
        );
      }
    }

    // Record event for deduplication
    await basePrisma.webhookEvent.create({
      data: {
        providerEventId: event.providerEventId,
        provider: job.data.provider,
        eventType: event.eventType,
      },
    });
  },
  {
    connection: redisConnection,
    concurrency: 10,
  },
);

statusWorker.on("failed", (job, err) => {
  logger.error(`[StatusWorker] Job ${job?.id} failed: ${err.message}`);
});

export default statusWorker;
