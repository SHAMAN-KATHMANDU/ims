import { basePrisma } from "@/config/prisma";
import type { Message, MessageContentType } from "@prisma/client";

const AI_REPLY_EVENT_PREFIX = "ai_reply:";

export class AiReplyRepository {
  buildEventId(inboundMessageId: string): string {
    return `${AI_REPLY_EVENT_PREFIX}${inboundMessageId}`;
  }

  async hasProcessedInboundMessage(inboundMessageId: string): Promise<boolean> {
    const existing = await basePrisma.webhookEvent.findUnique({
      where: { providerEventId: this.buildEventId(inboundMessageId) },
      select: { id: true },
    });
    return Boolean(existing);
  }

  async markProcessed(
    inboundMessageId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await basePrisma.webhookEvent.create({
      data: {
        providerEventId: this.buildEventId(inboundMessageId),
        provider: "FACEBOOK_MESSENGER",
        eventType: "ai_reply",
        rawPayload: payload as unknown as object,
      },
    });
  }

  async findInboundMessageForReply(params: {
    tenantId: string;
    conversationId: string;
    inboundMessageId: string;
  }): Promise<
    | (Message & {
        conversation: {
          id: string;
          tenantId: string;
          channelId: string;
          participantId: string;
          channel: { id: string; metadata: unknown };
        };
      })
    | null
  > {
    return basePrisma.message.findFirst({
      where: {
        id: params.inboundMessageId,
        conversationId: params.conversationId,
        direction: "INBOUND",
        conversation: { tenantId: params.tenantId },
      },
      include: {
        conversation: {
          select: {
            id: true,
            tenantId: true,
            channelId: true,
            participantId: true,
            channel: {
              select: {
                id: true,
                metadata: true,
              },
            },
          },
        },
      },
    });
  }

  async listRecentMessages(conversationId: string): Promise<
    Array<{
      id: string;
      direction: "INBOUND" | "OUTBOUND";
      contentType: MessageContentType;
      textContent: string | null;
    }>
  > {
    return basePrisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        direction: true,
        contentType: true,
        textContent: true,
      },
    });
  }

  async createPendingOutboundMessage(params: {
    conversationId: string;
    text: string;
    sourceInboundMessageId: string;
  }): Promise<{ id: string }> {
    const created = await basePrisma.message.create({
      data: {
        conversationId: params.conversationId,
        direction: "OUTBOUND",
        status: "PENDING",
        contentType: "TEXT",
        textContent: params.text,
        mediaPayload: {
          aiAutoReply: true,
          sourceInboundMessageId: params.sourceInboundMessageId,
        },
      },
      select: { id: true },
    });
    return created;
  }

  async getTenantSystemPrompt(tenantId: string): Promise<string | null> {
    const tenant = await basePrisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    if (
      tenant?.settings &&
      typeof tenant.settings === "object" &&
      "aiSystemPrompt" in tenant.settings
    ) {
      const raw = (tenant.settings as { aiSystemPrompt?: unknown })
        .aiSystemPrompt;
      return typeof raw === "string" && raw.trim() ? raw.trim() : null;
    }
    return null;
  }

  async hasRecentAutoReply(
    conversationId: string,
    since: Date,
  ): Promise<boolean> {
    const count = await basePrisma.message.count({
      where: {
        conversationId,
        direction: "OUTBOUND",
        createdAt: { gte: since },
        mediaPayload: {
          path: ["aiAutoReply"],
          equals: true,
        },
      },
    });
    return count > 0;
  }
}

export default new AiReplyRepository();
