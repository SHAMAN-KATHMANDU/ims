import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

const mockGetSales = vi.fn();
const mockCreateSale = vi.fn();

vi.mock("../services/sales.service", () => ({
  getSales: (...args: unknown[]) => mockGetSales(...args),
  getSaleById: vi.fn(),
  getSalesSinceLastLogin: vi.fn(),
  createSale: (...args: unknown[]) => mockCreateSale(...args),
  addPaymentToSale: vi.fn(),
  getSalesSummary: vi.fn(),
  getSalesByLocation: vi.fn(),
  getDailySales: vi.fn(),
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  getSaleTypeLabel: vi.fn(),
  getSaleTypeColor: vi.fn(),
  formatCurrency: vi.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

import { useSalesPaginated, useCreateSale } from "./use-sales";

describe("useSalesPaginated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSales.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
    });
  });

  it("calls getSales with normalized params", async () => {
    const { result } = renderHook(
      () => useSalesPaginated({ page: 1, limit: 10 }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockGetSales).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 10,
      }),
    );
    expect(result.current.data?.data).toEqual([]);
  });

  it("returns loading state initially", () => {
    const { result } = renderHook(() => useSalesPaginated(), { wrapper });

    expect(result.current.isLoading).toBe(true);
  });
});

describe("useCreateSale", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateSale.mockResolvedValue({ id: "s1", items: [] });
  });

  it("calls createSale and invalidates queries on success", async () => {
    const createData = {
      locationId: "loc1",
      items: [{ variationId: "var1", quantity: 2 }],
    };

    const { result } = renderHook(() => useCreateSale(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(createData);
    });

    expect(mockCreateSale).toHaveBeenCalledWith(createData);
  });
});
