import { createError } from "@/middlewares/errorHandler";
import { createPaginationResult } from "@/utils/pagination";
import notificationRepository from "./notification.repository";
import type { NotificationListQuery } from "./notification.schema";

export class NotificationService {
  async getAll(userId: string, query: NotificationListQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const unreadOnly = query.unreadOnly ?? false;
    const type = query.type;
    const [totalItems, notifications] = await Promise.all([
      notificationRepository.count({ userId, unreadOnly, type }),
      notificationRepository.findMany({
        userId,
        page,
        limit,
        unreadOnly,
        type,
      }),
    ]);
    const result = createPaginationResult(
      notifications,
      totalItems,
      page,
      limit,
    );
    return {
      notifications: result.data,
      pagination: result.pagination,
    };
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
