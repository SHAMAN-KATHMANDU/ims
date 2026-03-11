import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

const mockGetDeals = vi.fn();
const mockCreateDeal = vi.fn();

vi.mock("../services/deal.service", () => ({
  getDeals: (...args: unknown[]) => mockGetDeals(...args),
  getDealsKanban: vi.fn(),
  getDealById: vi.fn(),
  createDeal: (...args: unknown[]) => mockCreateDeal(...args),
  updateDeal: vi.fn(),
  updateDealStage: vi.fn(),
  deleteDeal: vi.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

import { useDealsPaginated, useCreateDeal } from "./use-deals";

describe("useDealsPaginated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDeals.mockResolvedValue({
      deals: [],
      pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
    });
  });

  it("calls getDeals with params", async () => {
    const { result } = renderHook(
      () => useDealsPaginated({ page: 1, limit: 10 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(mockGetDeals).toHaveBeenCalled();
  });
});

describe("useCreateDeal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateDeal.mockResolvedValue({ id: "d1", name: "Deal 1" });
  });

  it("calls createDeal on mutation", async () => {
    const createData = { name: "New Deal", value: 1000 };
    const { result } = renderHook(() => useCreateDeal(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(createData);
    });

    expect(mockCreateDeal).toHaveBeenCalledWith(createData);
  });
});
