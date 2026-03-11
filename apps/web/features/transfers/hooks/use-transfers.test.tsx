import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

const mockGetTransfers = vi.fn();
const mockCreateTransfer = vi.fn();

vi.mock("../services/transfer.service", () => ({
  getTransfers: (...args: unknown[]) => mockGetTransfers(...args),
  getTransferById: vi.fn(),
  getTransferLogs: vi.fn(),
  createTransfer: (...args: unknown[]) => mockCreateTransfer(...args),
  approveTransfer: vi.fn(),
  startTransit: vi.fn(),
  completeTransfer: vi.fn(),
  cancelTransfer: vi.fn(),
  getStatusColor: vi.fn(),
  getStatusLabel: vi.fn(),
  canApprove: vi.fn(),
  canStartTransit: vi.fn(),
  canComplete: vi.fn(),
  canCancel: vi.fn(),
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

import { useTransfersPaginated, useCreateTransfer } from "./use-transfers";

describe("useTransfersPaginated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTransfers.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
    });
  });

  it("calls getTransfers with normalized params", async () => {
    const { result } = renderHook(
      () => useTransfersPaginated({ page: 1, limit: 10 }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockGetTransfers).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 10,
      }),
    );
    expect(result.current.data?.data).toEqual([]);
  });
});

describe("useCreateTransfer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateTransfer.mockResolvedValue({
      id: "t1",
      status: "pending",
      items: [],
    });
  });

  it("calls createTransfer on mutation", async () => {
    const createData = {
      fromLocationId: "loc1",
      toLocationId: "loc2",
      items: [{ variationId: "var1", quantity: 5 }],
    };

    const { result } = renderHook(() => useCreateTransfer(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(createData);
    });

    expect(mockCreateTransfer).toHaveBeenCalledWith(createData);
  });
});
