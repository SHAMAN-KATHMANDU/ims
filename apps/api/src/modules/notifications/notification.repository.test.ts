/**
 * Unit tests for NotificationRepository — findMany, countUnread.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindMany, mockCount } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({
  default: {
    notification: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findFirst: vi.fn(),
      count: (...args: unknown[]) => mockCount(...args),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import notificationRepository from "./notification.repository";

describe("NotificationRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("findMany", () => {
    it("queries with userId", async () => {
      mockFindMany.mockResolvedValue([{ id: "n1", title: "New task" }]);

      const result = await notificationRepository.findMany({
        userId: "u1",
        page: 1,
        limit: 20,
        unreadOnly: false,
      });

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { userId: "u1" },
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 20,
      });
      expect(result).toHaveLength(1);
    });
  });

  describe("countUnread", () => {
    it("counts unread notifications for user", async () => {
      mockCount.mockResolvedValue(3);

      const result = await notificationRepository.countUnread("u1");

      expect(mockCount).toHaveBeenCalledWith({
        where: { userId: "u1", readAt: null },
      });
      expect(result).toBe(3);
    });
  });
});
