import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

const mockGetActivitiesByContact = vi.fn();
const mockGetActivitiesByDeal = vi.fn();
const mockCreateActivity = vi.fn();
const mockDeleteActivity = vi.fn();
const mockUseFeatureFlag = vi.fn(() => true);

vi.mock("../services/activity.service", () => ({
  getActivitiesByContact: (...args: unknown[]) =>
    mockGetActivitiesByContact(...args),
  getActivitiesByDeal: (...args: unknown[]) => mockGetActivitiesByDeal(...args),
  createActivity: (...args: unknown[]) => mockCreateActivity(...args),
  deleteActivity: (...args: unknown[]) => mockDeleteActivity(...args),
}));

vi.mock("@/features/flags", () => ({
  useFeatureFlag: () => mockUseFeatureFlag(),
  useEnvFeatureFlag: vi.fn(() => true),
}));

vi.mock("./use-crm", () => ({
  crmKeys: {
    all: ["crm"] as const,
    dashboard: () => ["crm", "dashboard"] as const,
    reports: (year?: number) => ["crm", "reports", year] as const,
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

import {
  useActivitiesByContact,
  useActivitiesByDeal,
  useCreateActivity,
  useDeleteActivity,
} from "./use-activities";

describe("useActivitiesByContact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockGetActivitiesByContact.mockResolvedValue({
      activities: [
        {
          id: "a1",
          type: "CALL",
          subject: "Follow-up call",
          activityAt: "2025-01-15T10:00:00Z",
          contactId: "c1",
          createdById: "u1",
          createdAt: "2025-01-15T10:00:00Z",
        },
      ],
      pagination: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
    });
  });

  it("calls getActivitiesByContact with contactId and params", async () => {
    const contactId = "c1";
    const params = { page: 1, limit: 10, type: "CALL" as const };

    const { result } = renderHook(
      () => useActivitiesByContact(contactId, params),
      { wrapper },
    );

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(mockGetActivitiesByContact).toHaveBeenCalledWith(contactId, params);
  });

  it("does not fetch when CRM feature is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(
      () => useActivitiesByContact("c1", { page: 1 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(mockGetActivitiesByContact).not.toHaveBeenCalled();
  });

  it("does not fetch when contactId is empty string", async () => {
    const { result } = renderHook(
      () => useActivitiesByContact("", { page: 1 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(mockGetActivitiesByContact).not.toHaveBeenCalled();
  });

  it("fetches with undefined params when not provided", async () => {
    const contactId = "c1";

    const { result } = renderHook(() => useActivitiesByContact(contactId), {
      wrapper,
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(mockGetActivitiesByContact).toHaveBeenCalledWith(
      contactId,
      undefined,
    );
  });
});

describe("useActivitiesByDeal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockGetActivitiesByDeal.mockResolvedValue({
      activities: [
        {
          id: "a2",
          type: "MEETING",
          subject: "Deal review",
          activityAt: "2025-01-20T14:00:00Z",
          dealId: "d1",
          createdById: "u1",
          createdAt: "2025-01-20T14:00:00Z",
        },
      ],
      pagination: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
    });
  });

  it("calls getActivitiesByDeal with dealId and params", async () => {
    const dealId = "d1";
    const params = { page: 2, limit: 15 };

    const { result } = renderHook(() => useActivitiesByDeal(dealId, params), {
      wrapper,
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(mockGetActivitiesByDeal).toHaveBeenCalledWith(dealId, params);
  });

  it("does not fetch when CRM feature is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useActivitiesByDeal("d1"), { wrapper });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(mockGetActivitiesByDeal).not.toHaveBeenCalled();
  });

  it("does not fetch when dealId is empty string", async () => {
    const { result } = renderHook(() => useActivitiesByDeal(""), { wrapper });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(mockGetActivitiesByDeal).not.toHaveBeenCalled();
  });

  it("refetches when dealId changes", async () => {
    const { result, rerender } = renderHook(
      ({ dealId }: { dealId: string }) => useActivitiesByDeal(dealId),
      { wrapper, initialProps: { dealId: "d1" } },
    );

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(mockGetActivitiesByDeal).toHaveBeenCalledWith("d1", undefined);

    rerender({ dealId: "d2" });

    await waitFor(() => {
      expect(mockGetActivitiesByDeal).toHaveBeenCalledWith("d2", undefined);
    });

    expect(mockGetActivitiesByDeal).toHaveBeenCalledTimes(2);
  });
});

describe("useCreateActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockCreateActivity.mockResolvedValue({
      activity: {
        id: "a3",
        type: "EMAIL",
        subject: "Campaign email",
        activityAt: "2025-01-25T09:30:00Z",
        createdById: "u1",
        createdAt: "2025-01-25T09:30:00Z",
      },
    });
  });

  it("calls createActivity with correct argument shape", async () => {
    const { result } = renderHook(() => useCreateActivity(), { wrapper });

    const activityData = {
      type: "EMAIL" as const,
      subject: "Test email",
      notes: "Test notes",
      activityAt: "2025-01-25T09:30:00Z",
      contactId: "c1",
      memberId: "m1",
      dealId: "d1",
    };

    await act(async () => {
      await result.current.mutateAsync(activityData);
    });

    expect(mockCreateActivity).toHaveBeenCalledWith(activityData);
  });

  it("throws error when CRM feature is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useCreateActivity(), { wrapper });

    const activityData = {
      type: "CALL" as const,
      subject: "Call",
    };

    await act(async () => {
      try {
        await result.current.mutateAsync(activityData);
        expect.fail("Should have thrown an error");
      } catch (err) {
        expect((err as Error).message).toBe("Feature disabled: SALES_PIPELINE");
      }
    });

    expect(mockCreateActivity).not.toHaveBeenCalled();
  });

  it("invalidates contact activities query on success when contactId provided", async () => {
    const { result } = renderHook(() => useCreateActivity(), { wrapper });

    const activityData = {
      type: "MEETING" as const,
      contactId: "c1",
    };

    let success = false;
    await act(async () => {
      const mutationResult = await result.current.mutateAsync(activityData);
      success = !!mutationResult;
    });

    expect(success).toBe(true);
    expect(mockCreateActivity).toHaveBeenCalledWith(activityData);
  });

  it("invalidates deal activities query on success when dealId provided", async () => {
    const { result } = renderHook(() => useCreateActivity(), { wrapper });

    const activityData = {
      type: "CALL" as const,
      dealId: "d1",
    };

    let success = false;
    await act(async () => {
      const mutationResult = await result.current.mutateAsync(activityData);
      success = !!mutationResult;
    });

    expect(success).toBe(true);
    expect(mockCreateActivity).toHaveBeenCalledWith(activityData);
  });

  it("handles mutation with minimal required fields", async () => {
    const { result } = renderHook(() => useCreateActivity(), { wrapper });

    const activityData = {
      type: "CALL" as const,
    };

    await act(async () => {
      await result.current.mutateAsync(activityData);
    });

    expect(mockCreateActivity).toHaveBeenCalledWith(activityData);
  });
});

describe("useDeleteActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockDeleteActivity.mockResolvedValue(undefined);
  });

  it("calls deleteActivity with activity id", async () => {
    const { result } = renderHook(() => useDeleteActivity(), { wrapper });

    const activityId = "a1";

    await act(async () => {
      await result.current.mutateAsync(activityId);
    });

    expect(mockDeleteActivity).toHaveBeenCalledWith(activityId);
  });

  it("throws error when CRM feature is disabled", async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useDeleteActivity(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync("a1");
        expect.fail("Should have thrown an error");
      } catch (err) {
        expect((err as Error).message).toBe("Feature disabled: SALES_PIPELINE");
      }
    });

    expect(mockDeleteActivity).not.toHaveBeenCalled();
  });

  it("mutation error is propagated", async () => {
    const testError = new Error("Delete failed");
    mockDeleteActivity.mockRejectedValueOnce(testError);

    const { result } = renderHook(() => useDeleteActivity(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync("a1");
        expect.fail("Should have thrown an error");
      } catch (err) {
        expect(err).toBe(testError);
      }
    });

    expect(mockDeleteActivity).toHaveBeenCalledWith("a1");
  });

  it("invalidates all activity queries on success", async () => {
    const { result } = renderHook(() => useDeleteActivity(), { wrapper });

    let success = false;
    await act(async () => {
      await result.current.mutateAsync("a1");
      success = true;
    });

    expect(success).toBe(true);
    expect(mockDeleteActivity).toHaveBeenCalledWith("a1");
  });
});
