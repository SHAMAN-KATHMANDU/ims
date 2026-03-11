import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

const mockGetSalesRevenue = vi.fn();

vi.mock("../services/analytics.service", () => ({
  getSalesRevenue: (...args: unknown[]) => mockGetSalesRevenue(...args),
  getInventoryOps: vi.fn(),
  getCustomersPromos: vi.fn(),
  getDiscountAnalytics: vi.fn(),
  getPaymentTrends: vi.fn(),
  getLocationComparison: vi.fn(),
  getMemberCohort: vi.fn(),
  getSalesExtended: vi.fn(),
  getProductInsights: vi.fn(),
  getInventoryExtended: vi.fn(),
  getCustomerInsights: vi.fn(),
  getTrends: vi.fn(),
  getFinancial: vi.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

import { useSalesRevenueAnalytics } from "./use-analytics";

describe("useSalesRevenueAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSalesRevenue.mockResolvedValue({ revenue: 0, sales: 0 });
  });

  it("calls getSalesRevenue with apiParams", async () => {
    const { result } = renderHook(
      () =>
        useSalesRevenueAnalytics({
          dateFrom: "2025-01-01",
          dateTo: "2025-01-31",
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(mockGetSalesRevenue).toHaveBeenCalledWith(
      expect.objectContaining({
        dateFrom: "2025-01-01",
        dateTo: "2025-01-31",
      }),
    );
  });
});
