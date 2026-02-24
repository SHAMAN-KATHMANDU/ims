/**
 * Notifications repository - database access for notifications module.
 */

import prisma from "@/config/prisma";
import type { Prisma } from "@prisma/client";

export const notificationsRepository = {
  findMany(params: {
    where: Prisma.NotificationWhereInput;
    orderBy: Prisma.NotificationOrderByWithRelationInput;
    take: number;
  }) {
    return prisma.notification.findMany({
      where: params.where,
      orderBy: params.orderBy,
      take: params.take,
    });
  },

  count(where: Prisma.NotificationWhereInput) {
    return prisma.notification.count({ where });
  },

  findByIdAndUser(id: string, userId: string) {
    return prisma.notification.findFirst({
      where: { id, userId },
    });
  },

  update(id: string, data: Prisma.NotificationUpdateInput) {
    return prisma.notification.update({
      where: { id },
      data,
    });
  },

  updateMany(
    where: Prisma.NotificationWhereInput,
    data: Prisma.NotificationUpdateManyMutationInput,
  ) {
    return prisma.notification.updateMany({
      where,
      data,
    });
  },

  create(data: Prisma.NotificationCreateInput) {
    return prisma.notification.create({ data });
  },
};
