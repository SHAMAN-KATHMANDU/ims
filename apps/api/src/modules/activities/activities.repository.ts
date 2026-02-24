/**
 * Activities repository - database access for activities module.
 */

import prisma from "@/config/prisma";
import type { Prisma } from "@prisma/client";

const activityCreateInclude = {
  contact: { select: { id: true, firstName: true, lastName: true } },
  member: { select: { id: true, name: true, phone: true } },
  deal: { select: { id: true, name: true } },
  creator: { select: { id: true, username: true } },
} as const;

const activityListInclude = {
  creator: { select: { id: true, username: true } },
  member: { select: { id: true, name: true, phone: true } },
  deal: { select: { id: true, name: true } },
} as const;

const activityListWithContactInclude = {
  ...activityListInclude,
  contact: { select: { id: true, firstName: true, lastName: true } },
} as const;

const activityDetailInclude = {
  contact: true,
  member: true,
  deal: true,
  creator: { select: { id: true, username: true } },
} as const;

export const activitiesRepository = {
  create(data: Prisma.ActivityCreateInput) {
    return prisma.activity.create({
      data,
      include: activityCreateInclude,
    });
  },

  findManyByContact(tenantId: string, contactId: string) {
    return prisma.activity.findMany({
      where: { tenantId, contactId, deletedAt: null },
      orderBy: { activityAt: "desc" },
      include: activityListInclude,
    });
  },

  findManyByDeal(tenantId: string, dealId: string) {
    return prisma.activity.findMany({
      where: { tenantId, dealId, deletedAt: null },
      orderBy: { activityAt: "desc" },
      include: activityListWithContactInclude,
    });
  },

  findById(id: string, tenantId: string) {
    return prisma.activity.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: activityDetailInclude,
    });
  },

  findByIdForDelete(id: string, tenantId: string) {
    return prisma.activity.findFirst({
      where: { id, tenantId },
    });
  },

  softDelete(id: string) {
    return prisma.activity.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};
