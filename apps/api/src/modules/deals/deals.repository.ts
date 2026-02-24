/**
 * Deals repository - all database access for deals module.
 */

import prisma from "@/config/prisma";
import type { Prisma } from "@prisma/client";

const dealListInclude = {
  contact: { select: { id: true, firstName: true, lastName: true } },
  member: { select: { id: true, name: true, phone: true } },
  company: { select: { id: true, name: true } },
  pipeline: true,
  assignedTo: { select: { id: true, username: true } },
} as const;

export const dealsRepository = {
  findPipeline(id: string | undefined, tenantId: string) {
    if (id) {
      return prisma.pipeline.findFirst({
        where: { id, tenantId },
        include: { pipelineStages: { orderBy: { order: "asc" } } },
      });
    }
    return prisma.pipeline.findFirst({
      where: { tenantId, isDefault: true },
      include: { pipelineStages: { orderBy: { order: "asc" } } },
    });
  },

  createDeal(data: Prisma.DealUncheckedCreateInput) {
    return prisma.deal.create({
      data,
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        member: { select: { id: true, name: true, phone: true, email: true } },
        company: { select: { id: true, name: true } },
        pipeline: true,
        assignedTo: { select: { id: true, username: true } },
      },
    });
  },

  findDeals(params: {
    where: Prisma.DealWhereInput;
    orderBy: Prisma.DealOrderByWithRelationInput;
    skip: number;
    take: number;
  }) {
    return prisma.deal.findMany({
      where: params.where,
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
      include: dealListInclude,
    });
  },

  countDeals(where: Prisma.DealWhereInput) {
    return prisma.deal.count({ where });
  },

  findDealById(id: string, tenantId: string) {
    return prisma.deal.findFirst({
      where: { id, tenantId },
      include: {
        contact: true,
        member: true,
        company: true,
        pipeline: true,
        assignedTo: { select: { id: true, username: true } },
        lead: true,
        tasks: {
          include: { assignedTo: { select: { id: true, username: true } } },
        },
        activities: {
          include: { creator: { select: { id: true, username: true } } },
        },
      },
    });
  },

  updateDeal(
    id: string,
    data: Prisma.DealUpdateInput,
    include?: Prisma.DealInclude,
  ) {
    return prisma.deal.update({
      where: { id },
      data,
      include:
        include ??
        ({
          contact: true,
          member: true,
          company: true,
          pipeline: true,
          assignedTo: { select: { id: true, username: true } },
        } as Prisma.DealInclude),
    });
  },

  createNotification(data: {
    userId: string;
    type: "DEAL_STAGE_CHANGE";
    title: string;
    message: string;
    resourceType: string;
    resourceId: string;
  }) {
    const { userId, type, title, message, resourceType, resourceId } = data;
    return prisma.notification.create({
      data: {
        type,
        title,
        message,
        resourceType,
        resourceId,
        user: { connect: { id: userId } },
      },
    });
  },
};
