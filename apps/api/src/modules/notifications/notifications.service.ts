/**
 * Notifications service - business logic for notifications module.
 */

import { NotFoundError } from "@/shared/errors";
import { notificationsRepository } from "./notifications.repository";

export interface NotificationListFilters {
  limit?: number;
  unreadOnly?: boolean;
}

export const notificationsService = {
  async getAll(userId: string, filters: NotificationListFilters) {
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const where: { userId: string; readAt?: null } = { userId };
    if (filters.unreadOnly) {
      where.readAt = null;
    }
    return notificationsRepository.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },

  async getUnreadCount(userId: string) {
    return notificationsRepository.count({
      userId,
      readAt: null,
    });
  },

  async markRead(id: string, userId: string) {
    const notification = await notificationsRepository.findByIdAndUser(
      id,
      userId,
    );
    if (!notification) {
      throw new NotFoundError("Notification not found");
    }
    await notificationsRepository.update(id, { readAt: new Date() });
  },

  async markAllRead(userId: string) {
    await notificationsRepository.updateMany(
      { userId, readAt: null },
      { readAt: new Date() },
    );
  },
};
