import prisma from "@/config/prisma";

export interface NotificationListParams {
  userId: string;
  limit: number;
  unreadOnly: boolean;
}

export class NotificationRepository {
  async findMany(params: NotificationListParams) {
    const where: { userId: string; readAt?: null } = { userId: params.userId };
    if (params.unreadOnly) {
      where.readAt = null;
    }

    return prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: params.limit,
    });
  }

  async countUnread(userId: string) {
    return prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  async findById(userId: string, id: string) {
    return prisma.notification.findFirst({
      where: { id, userId },
    });
  }

  async markAsRead(id: string) {
    return prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async deleteAll(userId: string) {
    return prisma.notification.deleteMany({
      where: { userId },
    });
  }
}

export default new NotificationRepository();
