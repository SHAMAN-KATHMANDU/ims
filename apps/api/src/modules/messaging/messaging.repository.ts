import prisma from "@/config/prisma";
import type {
  ConversationStatus,
  MessageDirection,
  MessageStatus,
  MessageContentType,
  Prisma,
} from "@prisma/client";

const messageReplyToSelect = {
  id: true,
  textContent: true,
  direction: true,
  contentType: true,
} as const;

const messageReactionInclude = {
  user: { select: { id: true, username: true } },
} as const;

const messageCreateInclude = {
  sentBy: { select: { id: true, username: true } },
  reactions: { include: messageReactionInclude },
  replyTo: { select: messageReplyToSelect },
} as const;

export type MessageWithCreateRelations = Prisma.MessageGetPayload<{
  include: typeof messageCreateInclude;
}>;

export class MessagingRepository {
  async findConversations(
    tenantId: string,
    filters: {
      status?: ConversationStatus;
      channelId?: string;
      assignedToId?: string;
    },
    page: number,
    limit: number,
  ) {
    const where: Record<string, unknown> = { tenantId, ...filters };
    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        orderBy: { lastMessageAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          channel: { select: { id: true, name: true, provider: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
          assignedTo: { select: { id: true, username: true } },
        },
      }),
      prisma.conversation.count({ where }),
    ]);
    return { conversations, total, page, limit };
  }

  async findConversationById(tenantId: string, id: string) {
    return prisma.conversation.findFirst({
      where: { id, tenantId },
      include: {
        channel: {
          select: { id: true, name: true, provider: true, externalId: true },
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        assignedTo: { select: { id: true, username: true } },
      },
    });
  }

  async updateConversation(
    id: string,
    data: Partial<{
      assignedToId: string | null;
      contactId: string | null;
      status: ConversationStatus;
      unreadCount: number;
    }>,
  ) {
    return prisma.conversation.update({
      where: { id },
      data,
    });
  }

  async findMessages(
    conversationId: string,
    cursor?: string,
    limit: number = 50,
  ) {
    return prisma.message.findMany({
      where: { conversationId },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        sentBy: { select: { id: true, username: true } },
        reactions: { include: messageReactionInclude },
        replyTo: { select: messageReplyToSelect },
      },
    });
  }

  async findMessageInTenant(tenantId: string, messageId: string) {
    return prisma.message.findFirst({
      where: { id: messageId, conversation: { tenantId } },
      include: {
        conversation: {
          select: {
            id: true,
            tenantId: true,
            channelId: true,
            participantId: true,
          },
        },
        sentBy: { select: { id: true, username: true } },
      },
    });
  }

  async findReplyTargetInConversation(
    conversationId: string,
    messageId: string,
  ) {
    return prisma.message.findFirst({
      where: { id: messageId, conversationId },
      select: { id: true },
    });
  }

  async createMessage(data: {
    conversationId: string;
    direction: MessageDirection;
    status: MessageStatus;
    contentType: MessageContentType;
    textContent?: string | null;
    mediaPayload?: unknown;
    providerMessageId?: string | null;
    sentById?: string | null;
    sentAt?: Date | null;
    deliveredAt?: Date | null;
    replyToId?: string | null;
  }): Promise<MessageWithCreateRelations> {
    return prisma.message.create({
      data,
      include: messageCreateInclude,
    }) as unknown as Promise<MessageWithCreateRelations>;
  }

  async addReaction(messageId: string, userId: string, emoji: string) {
    const reactionOwnerKey = `u:${userId}`;
    return prisma.messageReaction.upsert({
      where: {
        messageId_emoji_reactionOwnerKey: {
          messageId,
          emoji,
          reactionOwnerKey,
        },
      },
      create: {
        messageId,
        userId,
        emoji,
        reactionOwnerKey,
      },
      update: {},
      include: messageReactionInclude,
    });
  }

  async removeReaction(messageId: string, userId: string, emoji: string) {
    const reactionOwnerKey = `u:${userId}`;
    try {
      return await prisma.messageReaction.delete({
        where: {
          messageId_emoji_reactionOwnerKey: {
            messageId,
            emoji,
            reactionOwnerKey,
          },
        },
      });
    } catch {
      return null;
    }
  }

  async addExternalParticipantReaction(
    messageId: string,
    externalParticipantId: string,
    emoji: string,
  ) {
    const reactionOwnerKey = `e:${externalParticipantId}`;
    return prisma.messageReaction.upsert({
      where: {
        messageId_emoji_reactionOwnerKey: {
          messageId,
          emoji,
          reactionOwnerKey,
        },
      },
      create: {
        messageId,
        userId: null,
        externalParticipantId,
        emoji,
        reactionOwnerKey,
      },
      update: {},
      include: messageReactionInclude,
    });
  }

  async removeExternalParticipantReaction(
    messageId: string,
    externalParticipantId: string,
    emoji: string,
  ) {
    const reactionOwnerKey = `e:${externalParticipantId}`;
    try {
      return await prisma.messageReaction.delete({
        where: {
          messageId_emoji_reactionOwnerKey: {
            messageId,
            emoji,
            reactionOwnerKey,
          },
        },
      });
    } catch {
      return null;
    }
  }

  async findMessageIdByProviderMessageId(
    conversationId: string,
    providerMessageId: string,
  ) {
    return prisma.message.findFirst({
      where: { conversationId, providerMessageId },
      select: { id: true },
    });
  }

  async updateMessageText(messageId: string, textContent: string) {
    return prisma.message.update({
      where: { id: messageId },
      data: {
        textContent,
        editedAt: new Date(),
      },
      include: {
        sentBy: { select: { id: true, username: true } },
        reactions: { include: messageReactionInclude },
        replyTo: { select: messageReplyToSelect },
      },
    });
  }

  async markInboundMessagesRead(conversationId: string) {
    return prisma.message.updateMany({
      where: {
        conversationId,
        direction: "INBOUND",
        readAt: null,
        status: { not: "FAILED" },
      },
      data: {
        readAt: new Date(),
        status: "READ",
      },
    });
  }
}

export default new MessagingRepository();
