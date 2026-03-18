import prisma from "@/config/prisma";
import { MessagingProvider, ChannelStatus } from "@prisma/client";

export class MessagingChannelRepository {
  async findAll(tenantId: string) {
    return prisma.messagingChannel.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { conversations: true } },
      },
    });
  }

  async findById(tenantId: string, id: string) {
    return prisma.messagingChannel.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { conversations: true } },
      },
    });
  }

  async findByExternalId(provider: MessagingProvider, externalId: string) {
    return prisma.messagingChannel.findUnique({
      where: { provider_externalId: { provider, externalId } },
    });
  }

  async create(data: {
    tenantId: string;
    provider: MessagingProvider;
    name: string;
    externalId: string;
    credentialsEnc: string;
    webhookVerifyToken: string;
    metadata?: any;
    status?: ChannelStatus;
  }) {
    return prisma.messagingChannel.create({
      data: {
        ...data,
        status: data.status ?? "ACTIVE",
        connectedAt: new Date(),
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      status: ChannelStatus;
      credentialsEnc: string;
      metadata: any;
      disconnectedAt: Date | null;
    }>,
  ) {
    return prisma.messagingChannel.update({
      where: { id },
      data,
    });
  }

  async disconnect(id: string) {
    return prisma.messagingChannel.update({
      where: { id },
      data: {
        status: "DISCONNECTED",
        disconnectedAt: new Date(),
      },
    });
  }
}

export default new MessagingChannelRepository();
