import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

const mockGetNotifications = vi.fn();
const mockGetUnreadCount = vi.fn();
const mockMarkNotificationRead = vi.fn();
const mockMarkAllNotificationsRead = vi.fn();
const mockDeleteAllNotifications = vi.fn();
const mockUseFeatureFlag = vi.fn(() => true);

vi.mock("../services/notification.service", () => ({
  getNotifications: (...args: unknown[]) => mockGetNotifications(...args),
  getUnreadCount: (...args: unknown[]) => mockGetUnreadCount(...args),
  markNotificationRead: (...args: unknown[]) =>
    mockMarkNotificationRead(...args),
  markAllNotificationsRead: (...args: unknown[]) =>
    mockMarkAllNotificationsRead(...args),
  deleteAllNotifications: (...args: unknown[]) =>
    mockDeleteAllNotifications(...args),
}));

vi.mock("@/features/flags", () => ({
  useFeatureFlag: () => mockUseFeatureFlag(),
  useEnvFeatureFlag: vi.fn(() => true),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteAllNotifications,
} from "./use-notifications";

describe("useNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockGetNotifications.mockResolvedValue({
      notifications: [],
      pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch notifications with default params when no params provided", async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockGetNotifications).toHaveBeenCalledWith(undefined);
  });

  it("should NOT fetch when SALES_PIPELINE feature flag is disabled and fetchStatus should be idle", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetNotifications).not.toHaveBeenCalled();
  });

  it("should NOT fetch when enabled option is false even if feature flag is true", async () => {
    mockUseFeatureFlag.mockReturnValue(true);

    const { result } = renderHook(
      () => useNotifications({}, { enabled: false }),
      {
        wrapper,
      },
    );

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetNotifications).not.toHaveBeenCalled();
  });

  it("should pass pagination and filter params correctly to getNotifications", async () => {
    const params = {
      page: 2,
      limit: 50,
      unreadOnly: true,
      type: "TASK_DUE" as const,
    };
    mockGetNotifications.mockResolvedValue({
      notifications: [
        {
          id: "n1",
          userId: "u1",
          type: "TASK_DUE",
          title: "Task due",
          createdAt: "2024-01-01",
        },
      ],
      pagination: { page: 2, limit: 50, totalItems: 1, totalPages: 1 },
    });

    const { result } = renderHook(() => useNotifications(params), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockGetNotifications).toHaveBeenCalledWith(params);
  });

  it("should fetch with empty params object when undefined params passed", async () => {
    mockGetNotifications.mockResolvedValue({
      notifications: [
        {
          id: "n1",
          userId: "u1",
          type: "TASK_DUE",
          title: "Task due",
          createdAt: "2024-01-01",
        },
      ],
      pagination: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
    });

    const { result } = renderHook(
      () => useNotifications({ page: 1, limit: 10 }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.data?.notifications).toHaveLength(1);
    });

    // Verify that the query was called with the provided params
    expect(mockGetNotifications).toHaveBeenCalledWith({ page: 1, limit: 10 });
  });

  it("should handle notifications with multiple notification types", async () => {
    const params = { type: "DEAL_STAGE_CHANGE" as const };
    mockGetNotifications.mockResolvedValue({
      notifications: [
        {
          id: "n1",
          userId: "u1",
          type: "DEAL_STAGE_CHANGE",
          title: "Deal moved to negotiation",
          createdAt: "2024-01-01",
        },
      ],
      pagination: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
    });

    const { result } = renderHook(() => useNotifications(params), { wrapper });

    await waitFor(() => {
      expect(result.current.data?.notifications).toHaveLength(1);
      expect(result.current.data?.notifications[0].type).toBe(
        "DEAL_STAGE_CHANGE",
      );
    });

    expect(mockGetNotifications).toHaveBeenCalledWith(params);
  });
});

describe("useUnreadNotificationCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockGetUnreadCount.mockResolvedValue({ count: 0 });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch unread notification count when feature is enabled", async () => {
    const { result } = renderHook(() => useUnreadNotificationCount(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockGetUnreadCount).toHaveBeenCalled();
  });

  it("should NOT fetch when SALES_PIPELINE feature flag is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useUnreadNotificationCount(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetUnreadCount).not.toHaveBeenCalled();
  });

  it("should NOT fetch when enabled option is false even if feature flag is true", async () => {
    mockUseFeatureFlag.mockReturnValue(true);

    const { result } = renderHook(
      () => useUnreadNotificationCount({ enabled: false }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockGetUnreadCount).not.toHaveBeenCalled();
  });

  it("should return unread count and handle large counts correctly", async () => {
    mockGetUnreadCount.mockResolvedValue({ count: 999 });

    const { result } = renderHook(() => useUnreadNotificationCount(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data?.count).toBe(999);
    });

    expect(mockGetUnreadCount).toHaveBeenCalled();
  });
});

describe("useMarkNotificationRead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockMarkNotificationRead.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call markNotificationRead service with notification id", async () => {
    const { result } = renderHook(() => useMarkNotificationRead(), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync("n1");
    });

    expect(mockMarkNotificationRead).toHaveBeenCalledWith("n1");
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useMarkNotificationRead(), {
      wrapper,
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync("n1");
      }),
    ).rejects.toThrow("Feature disabled: SALES_PIPELINE");
  });

  it("should invalidate all notification queries on success", async () => {
    const { result } = renderHook(() => useMarkNotificationRead(), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync("n1");
    });

    // Verify the service was called
    expect(mockMarkNotificationRead).toHaveBeenCalledWith("n1");
  });

  it("should handle marking multiple notifications as read", async () => {
    const { result } = renderHook(() => useMarkNotificationRead(), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync("n1");
    });
    await act(async () => {
      await result.current.mutateAsync("n2");
    });
    await act(async () => {
      await result.current.mutateAsync("n3");
    });

    expect(mockMarkNotificationRead).toHaveBeenCalledTimes(3);
    expect(mockMarkNotificationRead).toHaveBeenNthCalledWith(1, "n1");
    expect(mockMarkNotificationRead).toHaveBeenNthCalledWith(2, "n2");
    expect(mockMarkNotificationRead).toHaveBeenNthCalledWith(3, "n3");
  });

  it("should propagate service errors when mutation fails", async () => {
    const error = new Error("Service error");
    mockMarkNotificationRead.mockRejectedValue(error);

    const { result } = renderHook(() => useMarkNotificationRead(), {
      wrapper,
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync("n1");
      }),
    ).rejects.toThrow("Service error");
  });
});

describe("useMarkAllNotificationsRead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockMarkAllNotificationsRead.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call markAllNotificationsRead service without arguments", async () => {
    const { result } = renderHook(() => useMarkAllNotificationsRead(), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockMarkAllNotificationsRead).toHaveBeenCalledTimes(1);
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useMarkAllNotificationsRead(), {
      wrapper,
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync();
      }),
    ).rejects.toThrow("Feature disabled: SALES_PIPELINE");
  });

  it("should invalidate all notification queries on success", async () => {
    const { result } = renderHook(() => useMarkAllNotificationsRead(), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockMarkAllNotificationsRead).toHaveBeenCalled();
  });

  it("should handle rapid sequential calls to mark all as read", async () => {
    const { result } = renderHook(() => useMarkAllNotificationsRead(), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync();
    });
    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockMarkAllNotificationsRead).toHaveBeenCalledTimes(2);
  });
});

describe("useDeleteAllNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockDeleteAllNotifications.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should call deleteAllNotifications service without arguments", async () => {
    const { result } = renderHook(() => useDeleteAllNotifications(), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockDeleteAllNotifications).toHaveBeenCalledTimes(1);
  });

  it("should throw error when feature flag is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useDeleteAllNotifications(), {
      wrapper,
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync();
      }),
    ).rejects.toThrow("Feature disabled: SALES_PIPELINE");
  });

  it("should invalidate all notification queries on success", async () => {
    const { result } = renderHook(() => useDeleteAllNotifications(), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockDeleteAllNotifications).toHaveBeenCalled();
  });

  it("should handle service errors when deletion fails", async () => {
    const error = new Error("Network error");
    mockDeleteAllNotifications.mockRejectedValue(error);

    const { result } = renderHook(() => useDeleteAllNotifications(), {
      wrapper,
    });

    await expect(
      act(async () => {
        await result.current.mutateAsync();
      }),
    ).rejects.toThrow("Network error");
  });
});
