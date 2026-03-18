import prisma from "@/config/prisma";
import type {
  ConversationStatus,
  MessageDirection,
  MessageStatus,
  MessageContentType,
} from "@prisma/client";

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
    const where: any = { tenantId, ...filters };
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
      },
    });
  }

  async createMessage(data: {
    conversationId: string;
    direction: MessageDirection;
    status: MessageStatus;
    contentType: MessageContentType;
    textContent?: string | null;
    mediaPayload?: any;
    providerMessageId?: string | null;
    sentById?: string | null;
    sentAt?: Date | null;
    deliveredAt?: Date | null;
  }) {
    return prisma.message.create({ data });
  }
}

export default new MessagingRepository();
