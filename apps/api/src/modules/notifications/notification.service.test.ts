import { describe, it, expect, vi, beforeEach } from "vitest";
import { createError } from "@/middlewares/errorHandler";

const mockCount = vi.fn();
const mockFindMany = vi.fn();
const mockCountUnread = vi.fn();
const mockFindById = vi.fn();
const mockMarkAsRead = vi.fn();
const mockMarkAllAsRead = vi.fn();
const mockDeleteAll = vi.fn();

vi.mock("./notification.repository", () => ({
  default: {
    count: (...args: unknown[]) => mockCount(...args),
    findMany: (...args: unknown[]) => mockFindMany(...args),
    countUnread: (...args: unknown[]) => mockCountUnread(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
    markAsRead: (...args: unknown[]) => mockMarkAsRead(...args),
    markAllAsRead: (...args: unknown[]) => mockMarkAllAsRead(...args),
    deleteAll: (...args: unknown[]) => mockDeleteAll(...args),
  },
}));

import { NotificationService } from "./notification.service";

const notificationService = new NotificationService();

describe("NotificationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAll", () => {
    it("returns notifications and pagination from repository", async () => {
      const notifications = [
        { id: "n1", title: "Alert", read: false },
      ] as unknown[];
      mockCount.mockResolvedValue(1);
      mockFindMany.mockResolvedValue(notifications);

      const result = await notificationService.getAll("u1", {
        page: 1,
        limit: 20,
      });
      expect(result.notifications).toEqual(notifications);
      expect(result.pagination).toEqual(
        expect.objectContaining({
          currentPage: 1,
          totalPages: 1,
          totalItems: 1,
          itemsPerPage: 20,
        }),
      );
      expect(mockCount).toHaveBeenCalledWith({
        userId: "u1",
        unreadOnly: false,
      });
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "u1",
          page: 1,
          limit: 20,
        }),
      );
    });
  });

  describe("getUnreadCount", () => {
    it("returns count from repository", async () => {
      mockCountUnread.mockResolvedValue(5);

      const result = await notificationService.getUnreadCount("u1");
      expect(result).toBe(5);
    });
  });

  describe("markRead", () => {
    it("throws 404 when notification not found", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        notificationService.markRead("u1", "missing"),
      ).rejects.toMatchObject(createError("Notification not found", 404));

      expect(mockMarkAsRead).not.toHaveBeenCalled();
    });

    it("marks as read when notification exists", async () => {
      mockFindById.mockResolvedValue({ id: "n1", read: false });
      mockMarkAsRead.mockResolvedValue(undefined);

      await notificationService.markRead("u1", "n1");
      expect(mockMarkAsRead).toHaveBeenCalledWith("n1");
    });
  });
});
