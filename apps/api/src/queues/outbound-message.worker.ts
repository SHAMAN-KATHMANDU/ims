import { Worker, Job } from "bullmq";
import fs from "fs";
import path from "path";
import { redisConnection } from "./queue.config";
import { basePrisma } from "@/config/prisma";
import { env } from "@/config/env";
import { getProvider } from "@/providers/provider-factory";
import { decrypt } from "@/utils/encryption";
import { getIO } from "@/config/socket.config";
import { logger } from "@/config/logger";

/**
 * Resolves a stored media URL to a publicly-reachable URL for providers that
 * download from a URL. Only used as fallback when direct file upload isn't possible.
 */
function resolveOutboundMediaUrl(url: unknown): string | undefined {
  if (typeof url !== "string" || !url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/uploads/")) {
    return `${env.publicServerOrigin}${url}`;
  }
  return url;
}

/**
 * If the stored URL points to a local upload (relative /uploads/... path or
 * a localhost URL referencing our own server), resolve it to the absolute
 * file path on disk so the provider can upload the file directly.
 */
function resolveLocalFilePath(url: unknown): string | undefined {
  if (typeof url !== "string" || !url) return undefined;

  let relativePath: string | undefined;

  if (url.startsWith("/uploads/")) {
    relativePath = url;
  } else {
    const serverOrigin = env.publicServerOrigin;
    if (url.startsWith(serverOrigin + "/uploads/")) {
      relativePath = url.slice(serverOrigin.length);
    }
  }

  if (!relativePath) return undefined;

  const absPath = path.join(process.cwd(), relativePath);
  if (fs.existsSync(absPath)) return absPath;

  return undefined;
}

function normalizeProviderMediaType(
  t: unknown,
): "image" | "video" | "audio" | "file" | undefined {
  if (t === "image" || t === "video" || t === "audio" || t === "file") {
    return t;
  }
  return undefined;
}

interface OutboundJobData {
  messageId: string;
  conversationId: string;
  channelId: string;
}

const outboundWorker = new Worker<OutboundJobData>(
  "messaging-outbound",
  async (job: Job<OutboundJobData>) => {
    const { messageId, conversationId, channelId } = job.data;

    // Load message, conversation, and channel
    const message = await basePrisma.message.findUnique({
      where: { id: messageId },
      include: {
        replyTo: { select: { providerMessageId: true } },
      },
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

    if (!channel.credentialsEnc) {
      logger.warn(
        `[OutboundWorker] Channel ${channelId} has no credentials; skipping send`,
      );
      return;
    }

    // Decrypt credentials and send
    const credentials = JSON.parse(decrypt(channel.credentialsEnc));
    const provider = getProvider(channel.provider);

    try {
      const payload = message.mediaPayload as {
        url?: string;
        type?: unknown;
      } | null;
      const rawUrl = payload?.url;
      const localFilePath = resolveLocalFilePath(rawUrl);
      const replyToProviderMessageId =
        message.replyTo?.providerMessageId ?? undefined;
      if (message.replyToId && !replyToProviderMessageId) {
        logger.warn(
          `[OutboundWorker] Message ${messageId} has replyToId but parent has no providerMessageId; Meta reply thread omitted`,
        );
      }

      const result = await provider.sendMessage(credentials, {
        recipientId: conversation.participantId,
        text: message.textContent || undefined,
        mediaUrl: localFilePath ? undefined : resolveOutboundMediaUrl(rawUrl),
        mediaFilePath: localFilePath,
        mediaType: normalizeProviderMediaType(payload?.type),
        ...(replyToProviderMessageId ? { replyToProviderMessageId } : {}),
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

      const lastMessageAt = new Date();
      const lastMessageText =
        message.textContent?.substring(0, 500) || "Media message";

      await basePrisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt,
          lastMessageText,
        },
      });

      const io = getIO();
      if (io) {
        io.to(`tenant:${conversation.tenantId}`).emit(
          "messaging:message-status",
          {
            messageId,
            conversationId,
            status: "SENT",
            sentAt: new Date(),
          },
        );
        io.to(`tenant:${conversation.tenantId}`).emit(
          "messaging:conversation-updated",
          {
            id: conversationId,
            lastMessageAt,
            lastMessageText,
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
              conversationId,
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
