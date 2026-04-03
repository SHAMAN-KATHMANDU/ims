import type { ConversationStatus, MessageContentType } from "@prisma/client";
import { env } from "@/config/env";
import { createError, type AppError } from "@/middlewares/errorHandler";
import { getIO } from "@/config/socket.config";
import { outboundQueue } from "@/queues/queue.config";
import { getProvider } from "@/providers/provider-factory";
import { decrypt } from "@/utils/encryption";
import messagingChannelRepository from "@/modules/messaging-channels/messaging-channel.repository";
import { MediaRepository } from "@/modules/media/media.repository";
import { keyMatchesMessagePrefix } from "@/lib/s3/s3Key";
import messagingRepository from "./messaging.repository";
import type { ProviderCredentials } from "@/providers/messaging-provider.interface";
import type {
  SendMessageDto,
  UpdateConversationDto,
  ConversationQuery,
  MessageQuery,
} from "./messaging.schema";

const messagingMediaAssetRepo = new MediaRepository();

/**
 * Strip NUL and other non-printable control characters (keep tab, LF, CR).
 */
export function sanitizeMessageText(
  text: string | undefined,
): string | undefined {
  if (text === undefined) return undefined;
  return [...text]
    .filter((ch) => {
      const c = ch.charCodeAt(0);
      if (c === 9 || c === 10 || c === 13) return true;
      return c >= 32;
    })
    .join("");
}

export function resolveMessagingMediaUrlForStorage(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/uploads/messaging/")) {
    return `${env.publicServerOrigin}${url}`;
  }
  return url;
}

function mapMediaTypeToContentType(
  mediaUrl: string | undefined,
  mediaType: SendMessageDto["mediaType"],
): MessageContentType {
  if (!mediaUrl) return "TEXT";
  const t = (mediaType ?? "image").toLowerCase();
  switch (t) {
    case "video":
      return "VIDEO";
    case "audio":
      return "AUDIO";
    case "file":
      return "FILE";
    case "image":
    default:
      return "IMAGE";
  }
}

function isAppError(err: unknown): err is AppError {
  return (
    err instanceof Error && typeof (err as AppError).statusCode === "number"
  );
}

function emitToTenant(
  tenantId: string,
  event: string,
  payload: Record<string, unknown>,
): void {
  const io = getIO();
  if (io) {
    io.to(`tenant:${tenantId}`).emit(event, payload);
  }
}

/** API/frontend expects `user` + `userId` for every reaction row. */
function serializeMessageReactionForApi(r: {
  id: string;
  messageId: string;
  userId: string | null;
  externalParticipantId: string | null;
  reactionOwnerKey: string;
  emoji: string;
  createdAt: Date;
  user: { id: string; username: string } | null;
}): Omit<typeof r, "reactionOwnerKey"> & { userId: string } {
  const { reactionOwnerKey: _ownerKey, ...rest } = r;
  void _ownerKey;
  if (rest.user && rest.userId) {
    return { ...rest, userId: rest.userId };
  }
  if (rest.externalParticipantId) {
    const ext = rest.externalParticipantId;
    return {
      ...rest,
      userId: `ext:${ext}`,
      user: { id: `ext:${ext}`, username: "Contact" },
    };
  }
  return {
    ...rest,
    userId: rest.userId ?? "",
    user: rest.user ?? { id: "", username: "Unknown" },
  };
}

type MessageForReactionSync = NonNullable<
  Awaited<ReturnType<typeof messagingRepository.findMessageInTenant>>
>;

async function syncMessengerReactionToProvider(params: {
  tenantId: string;
  message: MessageForReactionSync;
  mode: "react" | "unreact";
  emoji?: string;
}): Promise<void> {
  const { tenantId, message, mode, emoji } = params;
  if (!message.providerMessageId) {
    return;
  }

  const channel = await messagingChannelRepository.findById(
    tenantId,
    message.conversation.channelId,
  );
  if (!channel || channel.status !== "ACTIVE" || !channel.credentialsEnc) {
    return;
  }

  let credentials: ProviderCredentials;
  try {
    credentials = JSON.parse(
      decrypt(channel.credentialsEnc),
    ) as ProviderCredentials;
  } catch {
    throw createError("Channel credentials unavailable", 500);
  }

  const provider = getProvider(channel.provider);
  const recipientPsid = message.conversation.participantId;

  if (mode === "react" && emoji) {
    if (provider.reactToMessage) {
      await provider.reactToMessage(
        credentials,
        recipientPsid,
        message.providerMessageId,
        emoji,
      );
    }
  } else if (mode === "unreact") {
    if (provider.unreactToMessage) {
      await provider.unreactToMessage(
        credentials,
        recipientPsid,
        message.providerMessageId,
      );
    }
  }
}

export class MessagingService {
  async getConversations(tenantId: string, query: ConversationQuery) {
    const { status, channelId, assignedToId, page, limit } = query;
    return messagingRepository.findConversations(
      tenantId,
      { status, channelId, assignedToId },
      page,
      limit,
    );
  }

  async getConversation(tenantId: string, id: string) {
    const conversation = await messagingRepository.findConversationById(
      tenantId,
      id,
    );
    if (!conversation) throw createError("Conversation not found", 404);
    return conversation;
  }

  async updateConversation(
    tenantId: string,
    id: string,
    dto: UpdateConversationDto,
  ) {
    const conversation = await messagingRepository.findConversationById(
      tenantId,
      id,
    );
    if (!conversation) throw createError("Conversation not found", 404);

    return messagingRepository.updateConversation(id, {
      ...(dto.assignedToId !== undefined && { assignedToId: dto.assignedToId }),
      ...(dto.contactId !== undefined && { contactId: dto.contactId }),
      ...(dto.status !== undefined && { status: dto.status }),
    });
  }

  async getMessages(
    tenantId: string,
    conversationId: string,
    query: MessageQuery,
  ) {
    const conversation = await messagingRepository.findConversationById(
      tenantId,
      conversationId,
    );
    if (!conversation) throw createError("Conversation not found", 404);

    const messages = await messagingRepository.findMessages(
      conversationId,
      query.cursor,
      query.limit,
    );
    return messages.map((m) => ({
      ...m,
      reactions: m.reactions.map(serializeMessageReactionForApi),
    }));
  }

  async sendMessage(
    tenantId: string,
    conversationId: string,
    userId: string,
    dto: SendMessageDto,
  ) {
    const conversation = await messagingRepository.findConversationById(
      tenantId,
      conversationId,
    );
    if (!conversation) throw createError("Conversation not found", 404);

    const channel = await messagingChannelRepository.findById(
      tenantId,
      conversation.channelId,
    );
    if (!channel || channel.status !== "ACTIVE") {
      throw createError("Channel is not active", 400);
    }

    if (dto.replyToId) {
      const replyTarget =
        await messagingRepository.findReplyTargetInConversation(
          conversationId,
          dto.replyToId,
        );
      if (!replyTarget) {
        throw createError(
          "Reply target message not found in this conversation",
          400,
        );
      }
    }

    const safeText = sanitizeMessageText(dto.text);
    let storedMediaUrl: string | undefined;
    let mediaAssetId: string | null = null;

    if (dto.mediaAssetId) {
      const asset = await messagingMediaAssetRepo.findByIdForTenant(
        dto.mediaAssetId,
        tenantId,
      );
      if (!asset) {
        throw createError("Media asset not found", 404);
      }
      if (asset.purpose !== "message_media") {
        throw createError("Media asset is not valid for messaging", 400);
      }
      if (
        !keyMatchesMessagePrefix(
          asset.storageKey,
          tenantId,
          conversationId,
          env.photosS3KeyPrefix,
          { allowLegacyKeys: env.photosAllowLegacyKeys },
        )
      ) {
        throw createError(
          "Media asset does not belong to this conversation",
          400,
        );
      }
      storedMediaUrl = asset.publicUrl;
      mediaAssetId = asset.id;
    } else if (dto.mediaUrl) {
      storedMediaUrl = resolveMessagingMediaUrlForStorage(dto.mediaUrl);
    }

    const message = await messagingRepository.createMessage({
      conversationId,
      direction: "OUTBOUND",
      status: "PENDING",
      contentType: mapMediaTypeToContentType(storedMediaUrl, dto.mediaType),
      textContent: safeText ?? null,
      mediaPayload: storedMediaUrl
        ? { url: storedMediaUrl, type: dto.mediaType }
        : null,
      sentById: userId,
      replyToId: dto.replyToId ?? null,
      mediaAssetId,
    });

    await outboundQueue.add("outbound", {
      messageId: message.id,
      conversationId,
      channelId: conversation.channelId,
    });

    return {
      ...message,
      reactions: message.reactions.map(serializeMessageReactionForApi),
    };
  }

  async markRead(tenantId: string, conversationId: string) {
    const conversation = await messagingRepository.findConversationById(
      tenantId,
      conversationId,
    );
    if (!conversation) throw createError("Conversation not found", 404);

    await messagingRepository.updateConversation(conversationId, {
      unreadCount: 0,
    });

    await messagingRepository.markInboundMessagesRead(conversationId);

    emitToTenant(tenantId, "messaging:message-status", {
      conversationId,
    });

    return { ok: true as const };
  }

  async addReaction(
    tenantId: string,
    conversationId: string,
    messageId: string,
    userId: string,
    emoji: string,
  ) {
    const message = await messagingRepository.findMessageInTenant(
      tenantId,
      messageId,
    );
    if (!message || message.conversation.id !== conversationId) {
      throw createError("Message not found", 404);
    }

    const existingBefore =
      await messagingRepository.findReactionsByInternalUserOnMessage(
        messageId,
        userId,
      );
    const others = existingBefore.filter((r) => r.emoji !== emoji);

    for (const r of others) {
      const removed = await messagingRepository.removeReaction(
        messageId,
        userId,
        r.emoji,
      );
      if (!removed) continue;

      try {
        await syncMessengerReactionToProvider({
          tenantId,
          message,
          mode: "unreact",
        });
      } catch (err) {
        await messagingRepository.addReaction(messageId, userId, r.emoji);
        if (isAppError(err)) throw err;
        const detail =
          err instanceof Error ? err.message : "Provider unreact sync failed";
        throw createError(detail, 502);
      }

      emitToTenant(tenantId, "messaging:reaction-removed", {
        conversationId,
        messageId,
        emoji: r.emoji,
        userId,
      });
    }

    if (others.length === 0 && existingBefore.some((r) => r.emoji === emoji)) {
      const row = existingBefore.find((x) => x.emoji === emoji)!;
      return serializeMessageReactionForApi(row);
    }

    const reaction = await messagingRepository.addReaction(
      messageId,
      userId,
      emoji,
    );

    try {
      await syncMessengerReactionToProvider({
        tenantId,
        message,
        mode: "react",
        emoji,
      });
    } catch (err) {
      await messagingRepository.removeReaction(messageId, userId, emoji);
      if (isAppError(err)) throw err;
      const detail =
        err instanceof Error ? err.message : "Provider reaction sync failed";
      throw createError(detail, 502);
    }

    emitToTenant(tenantId, "messaging:reaction-added", {
      conversationId,
      messageId,
      reaction: {
        id: reaction.id,
        emoji: reaction.emoji,
        userId: reaction.userId!,
        username: reaction.user!.username,
      },
    });

    return serializeMessageReactionForApi(reaction);
  }

  async removeReaction(
    tenantId: string,
    conversationId: string,
    messageId: string,
    userId: string,
    emoji: string,
  ) {
    const message = await messagingRepository.findMessageInTenant(
      tenantId,
      messageId,
    );
    if (!message || message.conversation.id !== conversationId) {
      throw createError("Message not found", 404);
    }

    const removed = await messagingRepository.removeReaction(
      messageId,
      userId,
      emoji,
    );
    if (!removed) {
      throw createError("Reaction not found", 404);
    }

    try {
      await syncMessengerReactionToProvider({
        tenantId,
        message,
        mode: "unreact",
      });
    } catch (err) {
      await messagingRepository.addReaction(messageId, userId, emoji);
      if (isAppError(err)) throw err;
      const detail =
        err instanceof Error ? err.message : "Provider unreact sync failed";
      throw createError(detail, 502);
    }

    emitToTenant(tenantId, "messaging:reaction-removed", {
      conversationId,
      messageId,
      emoji,
      userId,
    });

    return { ok: true as const };
  }

  async editMessage(
    tenantId: string,
    conversationId: string,
    messageId: string,
    userId: string,
    text: string,
  ) {
    const message = await messagingRepository.findMessageInTenant(
      tenantId,
      messageId,
    );
    if (!message || message.conversation.id !== conversationId) {
      throw createError("Message not found", 404);
    }

    if (message.direction !== "OUTBOUND") {
      throw createError("You can only edit your own outbound messages", 403);
    }

    const senderMatches =
      message.sentById === userId || message.sentBy?.id === userId;
    if (!senderMatches) {
      throw createError("You can only edit your own outbound messages", 403);
    }

    if (message.status === "FAILED") {
      throw createError("Cannot edit a failed message", 400);
    }

    const safeText = sanitizeMessageText(text);
    if (!safeText?.length) {
      throw createError("Text is required", 400);
    }

    const updated = await messagingRepository.updateMessageText(
      messageId,
      safeText,
    );

    emitToTenant(tenantId, "messaging:message-edited", {
      conversationId,
      messageId,
      textContent: updated.textContent,
      editedAt: updated.editedAt?.toISOString() ?? null,
    });

    return {
      ...updated,
      reactions: updated.reactions.map(serializeMessageReactionForApi),
    };
  }
}

export default new MessagingService();
