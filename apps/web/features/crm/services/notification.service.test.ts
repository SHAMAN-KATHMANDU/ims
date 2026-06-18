import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteAllNotifications,
  type Notification,
  type NotificationsResponse,
} from "./notification.service";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/axios", () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

describe("notification.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: getNotifications with all optional parameters
  it("gets notifications with all optional params (page, limit, unreadOnly, type)", async () => {
    const mockNotifications: Notification[] = [
      {
        id: "n1",
        userId: "u1",
        type: "TASK_DUE",
        title: "Task Due",
        message: "Your task is due",
        resourceType: "task",
        resourceId: "t1",
        readAt: null,
        createdAt: "2024-01-01T10:00:00Z",
      },
    ];
    const mockResponse: NotificationsResponse = {
      notifications: mockNotifications,
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    };

    mockGet.mockResolvedValue({ data: mockResponse });

    const result = await getNotifications({
      page: 1,
      limit: 10,
      unreadOnly: true,
      type: "TASK_DUE",
    });

    expect(mockGet).toHaveBeenCalledWith("/notifications", {
      params: {
        page: 1,
        limit: 10,
        unreadOnly: true,
        type: "TASK_DUE",
      },
    });
    expect(result).toEqual(mockResponse);
    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0].type).toBe("TASK_DUE");
  });

  // Test 2: getNotifications with no parameters (defaults)
  it("gets notifications without optional params (defaults)", async () => {
    const mockResponse: NotificationsResponse = {
      notifications: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    };

    mockGet.mockResolvedValue({ data: mockResponse });

    const result = await getNotifications();

    expect(mockGet).toHaveBeenCalledWith("/notifications", {
      params: undefined,
    });
    expect(result.notifications).toHaveLength(0);
  });

  // Test 3: getNotifications with mixed optional parameters
  it("gets notifications with partial params (limit and type only)", async () => {
    const mockNotifications: Notification[] = [
      {
        id: "n2",
        userId: "u2",
        type: "DEAL_STAGE_CHANGE",
        title: "Deal Stage Changed",
        message: null,
        resourceType: "deal",
        resourceId: "d1",
        readAt: "2024-01-02T10:00:00Z",
        createdAt: "2024-01-02T09:00:00Z",
      },
    ];
    const mockResponse: NotificationsResponse = {
      notifications: mockNotifications,
      pagination: { page: 1, limit: 5, total: 1, totalPages: 1 },
    };

    mockGet.mockResolvedValue({ data: mockResponse });

    const result = await getNotifications({
      limit: 5,
      type: "DEAL_STAGE_CHANGE",
    });

    expect(mockGet).toHaveBeenCalledWith("/notifications", {
      params: {
        limit: 5,
        type: "DEAL_STAGE_CHANGE",
      },
    });
    expect(result.notifications[0].readAt).toBe("2024-01-02T10:00:00Z");
    expect(result.notifications[0].type).toBe("DEAL_STAGE_CHANGE");
  });

  // Test 4: getNotifications returns empty array with valid pagination
  it("gets empty notifications array with valid pagination metadata", async () => {
    const mockResponse: NotificationsResponse = {
      notifications: [],
      pagination: { page: 2, limit: 10, total: 0, totalPages: 0 },
    };

    mockGet.mockResolvedValue({ data: mockResponse });

    const result = await getNotifications({ page: 2, limit: 10 });

    expect(result.notifications).toEqual([]);
    expect(result.pagination.page).toBe(2);
    expect(result.pagination.total).toBe(0);
  });

  // Test 5: getUnreadCount returns count
  it("gets unread notification count", async () => {
    mockGet.mockResolvedValue({ data: { count: 5 } });

    const result = await getUnreadCount();

    expect(mockGet).toHaveBeenCalledWith("/notifications/unread-count");
    expect(result.count).toBe(5);
  });

  // Test 6: getUnreadCount with zero unread
  it("gets unread count when count is zero", async () => {
    mockGet.mockResolvedValue({ data: { count: 0 } });

    const result = await getUnreadCount();

    expect(result.count).toBe(0);
  });

  // Test 7: markNotificationRead marks specific notification
  it("marks a single notification as read", async () => {
    mockPost.mockResolvedValue(undefined);

    await markNotificationRead("n1");

    expect(mockPost).toHaveBeenCalledWith("/notifications/n1/read");
  });

  // Test 8: markNotificationRead with special characters in ID
  it("marks notification as read with special ID characters", async () => {
    mockPost.mockResolvedValue(undefined);

    await markNotificationRead("n-uuid-123");

    expect(mockPost).toHaveBeenCalledWith("/notifications/n-uuid-123/read");
  });

  // Test 9: markAllNotificationsRead marks all as read
  it("marks all notifications as read", async () => {
    mockPost.mockResolvedValue(undefined);

    await markAllNotificationsRead();

    expect(mockPost).toHaveBeenCalledWith("/notifications/read-all");
  });

  // Test 10: deleteAllNotifications deletes all
  it("deletes all notifications", async () => {
    mockDelete.mockResolvedValue(undefined);

    await deleteAllNotifications();

    expect(mockDelete).toHaveBeenCalledWith("/notifications");
  });

  // Test 11: getNotifications with LEAD_ASSIGNMENT type
  it("gets notifications filtered by LEAD_ASSIGNMENT type", async () => {
    const mockNotifications: Notification[] = [
      {
        id: "n3",
        userId: "u3",
        type: "LEAD_ASSIGNMENT",
        title: "Lead Assigned",
        message: "You have been assigned a new lead",
        resourceType: "lead",
        resourceId: "l1",
        readAt: null,
        createdAt: "2024-01-03T10:00:00Z",
      },
    ];
    const mockResponse: NotificationsResponse = {
      notifications: mockNotifications,
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    };

    mockGet.mockResolvedValue({ data: mockResponse });

    const result = await getNotifications({ type: "LEAD_ASSIGNMENT" });

    expect(mockGet).toHaveBeenCalledWith("/notifications", {
      params: { type: "LEAD_ASSIGNMENT" },
    });
    expect(result.notifications[0].type).toBe("LEAD_ASSIGNMENT");
  });

  // Test 12: Error handling when getNotifications rejects
  it("throws error when getNotifications request fails", async () => {
    const error = new Error("Network error");
    mockGet.mockRejectedValue(error);

    await expect(getNotifications()).rejects.toThrow("Network error");
  });

  // Test 13: Error handling when markNotificationRead fails
  it("throws error when marking notification as read fails", async () => {
    const error = new Error("Notification not found");
    mockPost.mockRejectedValue(error);

    await expect(markNotificationRead("invalid-id")).rejects.toThrow(
      "Notification not found",
    );
  });

  // Test 14: Multiple notification types in response
  it("gets notifications with multiple different types", async () => {
    const mockNotifications: Notification[] = [
      {
        id: "n1",
        userId: "u1",
        type: "TASK_DUE",
        title: "Task Due",
        message: null,
        resourceType: "task",
        resourceId: "t1",
        readAt: null,
        createdAt: "2024-01-01T10:00:00Z",
      },
      {
        id: "n2",
        userId: "u1",
        type: "DEAL_STAGE_CHANGE",
        title: "Deal Updated",
        message: "Deal moved to negotiation",
        resourceType: "deal",
        resourceId: "d1",
        readAt: null,
        createdAt: "2024-01-02T10:00:00Z",
      },
      {
        id: "n3",
        userId: "u1",
        type: "LEAD_ASSIGNMENT",
        title: "New Lead",
        message: null,
        resourceType: "lead",
        resourceId: "l1",
        readAt: "2024-01-03T10:00:00Z",
        createdAt: "2024-01-03T10:00:00Z",
      },
    ];
    const mockResponse: NotificationsResponse = {
      notifications: mockNotifications,
      pagination: { page: 1, limit: 10, total: 3, totalPages: 1 },
    };

    mockGet.mockResolvedValue({ data: mockResponse });

    const result = await getNotifications();

    expect(result.notifications).toHaveLength(3);
    expect(result.notifications[0].type).toBe("TASK_DUE");
    expect(result.notifications[1].type).toBe("DEAL_STAGE_CHANGE");
    expect(result.notifications[2].type).toBe("LEAD_ASSIGNMENT");
  });

  // Test 15: Pagination with high page number
  it("handles pagination with high page numbers", async () => {
    const mockResponse: NotificationsResponse = {
      notifications: [],
      pagination: { page: 100, limit: 10, total: 1000, totalPages: 100 },
    };

    mockGet.mockResolvedValue({ data: mockResponse });

    const result = await getNotifications({ page: 100, limit: 10 });

    expect(mockGet).toHaveBeenCalledWith("/notifications", {
      params: { page: 100, limit: 10 },
    });
    expect(result.pagination.page).toBe(100);
    expect(result.pagination.totalPages).toBe(100);
  });
});
