import { createError } from "@/middlewares/errorHandler";
import { outboundQueue } from "@/queues/queue.config";
import messagingRepository from "./messaging.repository";
import messagingChannelRepository from "@/modules/messaging-channels/messaging-channel.repository";
import type {
  SendMessageDto,
  UpdateConversationDto,
  ConversationQuery,
  MessageQuery,
} from "./messaging.schema";

export class MessagingService {
  async getConversations(tenantId: string, query: ConversationQuery) {
    const { status, channelId, assignedToId, page, limit } = query;
    return messagingRepository.findConversations(
      tenantId,
      { status: status as any, channelId, assignedToId },
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

    return messagingRepository.findMessages(
      conversationId,
      query.cursor,
      query.limit,
    );
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

    const message = await messagingRepository.createMessage({
      conversationId,
      direction: "OUTBOUND",
      status: "PENDING",
      contentType: dto.mediaUrl ? "IMAGE" : "TEXT",
      textContent: dto.text || null,
      mediaPayload: dto.mediaUrl
        ? { url: dto.mediaUrl, type: dto.mediaType }
        : null,
      sentById: userId,
    });

    // Enqueue for outbound delivery
    await outboundQueue.add("outbound", {
      messageId: message.id,
      conversationId,
      channelId: conversation.channelId,
    });

    return message;
  }

  async markRead(tenantId: string, conversationId: string) {
    const conversation = await messagingRepository.findConversationById(
      tenantId,
      conversationId,
    );
    if (!conversation) throw createError("Conversation not found", 404);

    return messagingRepository.updateConversation(conversationId, {
      unreadCount: 0,
    });
  }
}

export default new MessagingService();
