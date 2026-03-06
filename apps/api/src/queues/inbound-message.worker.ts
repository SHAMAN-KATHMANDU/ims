import { Worker, Job } from "bullmq";
import { redisConnection } from "./queue.config";
import { basePrisma } from "@/config/prisma";
import prisma from "@/config/prisma";
import { runWithTenant } from "@/config/tenantContext";
import { getProvider } from "@/providers/provider-factory";
import { decrypt } from "@/utils/encryption";
import { getIO } from "@/config/socket.config";
import { logger } from "@/config/logger";
import type { MessagingProvider } from "@prisma/client";
import type { NormalizedInboundEvent } from "@/providers/messaging-provider.interface";

interface InboundJobData {
  provider: MessagingProvider;
  event: NormalizedInboundEvent;
}

const inboundWorker = new Worker<InboundJobData>(
  "messaging:inbound",
  async (job: Job<InboundJobData>) => {
    const { provider, event } = job.data;

    // 1. Deduplication
    const existing = await basePrisma.webhookEvent.findUnique({
      where: { providerEventId: event.providerEventId },
    });
    if (existing) {
      logger.log(
        `[InboundWorker] Duplicate event ${event.providerEventId}, skipping`,
      );
      return;
    }

    // 2. Resolve channel and tenant
    const channel = await basePrisma.messagingChannel.findUnique({
      where: {
        provider_externalId: { provider, externalId: event.externalId },
      },
    });

    if (!channel || channel.status !== "ACTIVE") {
      logger.warn(
        `[InboundWorker] No active channel for ${provider}:${event.externalId}`,
      );
      await basePrisma.webhookEvent.create({
        data: {
          providerEventId: event.providerEventId,
          provider,
          eventType: event.eventType,
          rawPayload: event as any,
        },
      });
      return;
    }

    const tenantId = channel.tenantId;

    // 3. Process within tenant context
    await runWithTenant(tenantId, async () => {
      if (event.eventType === "message" || event.eventType === "postback") {
        // Upsert conversation
        let conversation = await prisma.conversation.findFirst({
          where: { channelId: channel.id, participantId: event.participantId },
        });

        const messageText =
          event.eventType === "postback"
            ? event.postback?.title
            : event.message?.text;

        if (!conversation) {
          // Fetch participant profile if available
          let participantName = event.participantName || null;
          if (!participantName) {
            try {
              const providerInstance = getProvider(provider);
              if (providerInstance.getParticipantProfile) {
                const creds = JSON.parse(decrypt(channel.credentialsEnc));
                const profile = await providerInstance.getParticipantProfile(
                  creds,
                  event.participantId,
                );
                participantName = profile.name || null;
              }
            } catch {
              // Profile fetch is best-effort
            }
          }

          conversation = await prisma.conversation.create({
            data: {
              tenantId,
              channelId: channel.id,
              participantId: event.participantId,
              participantName,
              status: "OPEN",
              lastMessageAt: new Date(event.timestamp),
              lastMessageText: messageText?.substring(0, 500) || null,
              unreadCount: 1,
            },
          });
        } else {
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              lastMessageAt: new Date(event.timestamp),
              lastMessageText:
                messageText?.substring(0, 500) || conversation.lastMessageText,
              unreadCount: { increment: 1 },
              status: "OPEN",
            },
          });
        }

        // Create message
        const contentType =
          event.eventType === "postback"
            ? "POSTBACK"
            : (event.message?.contentType as any) || "TEXT";

        const message = await prisma.message.create({
          data: {
            conversationId: conversation.id,
            direction: "INBOUND",
            status: "DELIVERED",
            contentType,
            textContent: messageText || null,
            mediaPayload: (event.message?.mediaPayload as any) || null,
            providerMessageId: event.providerEventId,
            sentAt: new Date(event.timestamp),
            deliveredAt: new Date(event.timestamp),
          },
        });

        // Emit real-time events
        const io = getIO();
        if (io) {
          io.to(`tenant:${tenantId}`).emit("messaging:new-message", {
            conversationId: conversation.id,
            message: {
              id: message.id,
              direction: message.direction,
              contentType: message.contentType,
              textContent: message.textContent,
              sentAt: message.sentAt,
              createdAt: message.createdAt,
            },
          });

          io.to(`tenant:${tenantId}`).emit("messaging:conversation-updated", {
            id: conversation.id,
            lastMessageAt: new Date(event.timestamp),
            lastMessageText: messageText?.substring(0, 500),
            unreadCount: (conversation.unreadCount || 0) + 1,
          });
        }

        // Create notification for assigned user
        if (conversation.assignedToId) {
          await prisma.notification.create({
            data: {
              userId: conversation.assignedToId,
              type: "NEW_MESSAGE",
              title: `New message from ${conversation.participantName || event.participantId}`,
              message:
                messageText?.substring(0, 200) || "Media message received",
              resourceType: "conversation",
              resourceId: conversation.id,
            },
          });
        }
      }

      // Record webhook event for deduplication
      await basePrisma.webhookEvent.create({
        data: {
          providerEventId: event.providerEventId,
          provider,
          eventType: event.eventType,
        },
      });
    });
  },
  {
    connection: redisConnection,
    concurrency: 10,
  },
);

inboundWorker.on("failed", (job, err) => {
  logger.error(`[InboundWorker] Job ${job?.id} failed: ${err.message}`);
});

export default inboundWorker;
