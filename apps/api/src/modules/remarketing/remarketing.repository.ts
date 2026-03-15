import prisma from "@/config/prisma";
import type { SequenceStatus } from "@prisma/client";

export class RemarketingRepository {
  async createSequence(data: {
    tenantId: string;
    contactId: string;
    dealId: string;
    sequenceDay: number;
    message?: string;
    scheduledAt: Date;
  }) {
    return prisma.remarketingSequence.create({ data });
  }

  async createManySequences(
    entries: Array<{
      tenantId: string;
      contactId: string;
      dealId: string;
      sequenceDay: number;
      message?: string;
      scheduledAt: Date;
    }>,
  ) {
    return prisma.remarketingSequence.createMany({ data: entries });
  }

  async findPendingDue(limit = 100) {
    return prisma.remarketingSequence.findMany({
      where: {
        status: "PENDING",
        scheduledAt: { lte: new Date() },
      },
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true, tenantId: true },
        },
        deal: {
          select: {
            id: true,
            name: true,
            pipelineId: true,
            assignedToId: true,
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
      take: limit,
    });
  }

  async markExecuted(id: string) {
    return prisma.remarketingSequence.update({
      where: { id },
      data: { status: "EXECUTED", executedAt: new Date() },
    });
  }

  async updateStatus(id: string, status: SequenceStatus) {
    return prisma.remarketingSequence.update({
      where: { id },
      data: { status },
    });
  }

  async pauseByContact(contactId: string) {
    return prisma.remarketingSequence.updateMany({
      where: { contactId, status: "PENDING" },
      data: { status: "PAUSED" },
    });
  }

  async resumeByContact(contactId: string) {
    return prisma.remarketingSequence.updateMany({
      where: { contactId, status: "PAUSED" },
      data: { status: "PENDING" },
    });
  }

  async findByDeal(dealId: string) {
    return prisma.remarketingSequence.findMany({
      where: { dealId },
      orderBy: { sequenceDay: "asc" },
    });
  }

  async findByContact(contactId: string) {
    return prisma.remarketingSequence.findMany({
      where: { contactId },
      orderBy: { scheduledAt: "asc" },
    });
  }

  async hasOpenRepurchaseDeal(contactId: string): Promise<boolean> {
    const count = await prisma.deal.count({
      where: {
        contactId,
        status: "OPEN",
        deletedAt: null,
        isLatest: true,
        pipeline: { type: "REPURCHASE" },
      },
    });
    return count > 0;
  }
}

export default new RemarketingRepository();
