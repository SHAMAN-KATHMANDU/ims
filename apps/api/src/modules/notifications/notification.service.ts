import { createError } from "@/middlewares/errorHandler";
import notificationRepository from "./notification.repository";
import type { NotificationListQuery } from "./notification.schema";

export class NotificationService {
  async getAll(userId: string, query: NotificationListQuery) {
    return notificationRepository.findMany({
      userId,
      limit: query.limit ?? 20,
      unreadOnly: query.unreadOnly ?? false,
    });
  }

  async getUnreadCount(userId: string) {
    return notificationRepository.countUnread(userId);
  }

  async markRead(userId: string, id: string) {
    const notification = await notificationRepository.findById(userId, id);
    if (!notification) throw createError("Notification not found", 404);
    await notificationRepository.markAsRead(id);
  }

  async markAllRead(userId: string) {
    await notificationRepository.markAllAsRead(userId);
  }

  async deleteAll(userId: string) {
    await notificationRepository.deleteAll(userId);
  }
}

export default new NotificationService();
