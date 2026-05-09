import { describe, it, expect, vi, beforeEach } from "vitest";
import { analyticsService, type OverviewMetrics } from "./analytics.service";

vi.mock("@/lib/axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock("@/lib/api-error", () => ({
  handleApiError: vi.fn((_error) => {
    throw new Error("API Error");
  }),
}));

import api from "@/lib/axios";

describe("analyticsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getOverview", () => {
    it("returns overview metrics", async () => {
      const mockMetrics: OverviewMetrics = {
        totalRevenue: 10000,
        totalSales: 50,
        averageOrderValue: 200,
        conversionRate: 5.5,
        newCustomers: 10,
        returningCustomers: 40,
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        data: { overview: mockMetrics },
      });

      const result = await analyticsService.getOverview();

      expect(result).toEqual(mockMetrics);
      expect(api.get).toHaveBeenCalledWith(
        "/analytics/overview",
        expect.any(Object),
      );
    });

    it("accepts date params", async () => {
      const mockMetrics: OverviewMetrics = {
        totalRevenue: 5000,
        totalSales: 25,
        averageOrderValue: 200,
        conversionRate: 5,
        newCustomers: 5,
        returningCustomers: 20,
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        data: { overview: mockMetrics },
      });

      await analyticsService.getOverview({
        dateFrom: "2026-04-09",
        dateTo: "2026-05-09",
      });

      expect(api.get).toHaveBeenCalledWith(
        "/analytics/overview",
        expect.objectContaining({
          params: expect.objectContaining({
            dateFrom: "2026-04-09",
            dateTo: "2026-05-09",
          }),
        }),
      );
    });
  });

  describe("getSalesRevenue", () => {
    it("returns sales revenue metrics", async () => {
      const mockMetrics = {
        totalRevenue: 10000,
        totalSales: 50,
        averageOrderValue: 200,
        trend: [
          { date: "2026-05-01", revenue: 1000, sales: 5 },
          { date: "2026-05-09", revenue: 2000, sales: 10 },
        ],
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        data: { salesRevenue: mockMetrics },
      });

      const result = await analyticsService.getSalesRevenue();

      expect(result).toEqual(mockMetrics);
      expect(api.get).toHaveBeenCalledWith(
        "/analytics/sales-revenue",
        expect.any(Object),
      );
    });
  });

  describe("getInventoryOps", () => {
    it("returns inventory ops metrics", async () => {
      const mockMetrics = {
        totalItems: 1000,
        lowStockItems: 50,
        outOfStockItems: 10,
        turnoverRate: 4.5,
        daysOnHand: 45,
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        data: { inventoryOps: mockMetrics },
      });

      const result = await analyticsService.getInventoryOps();

      expect(result).toEqual(mockMetrics);
      expect(api.get).toHaveBeenCalledWith(
        "/analytics/inventory-ops",
        expect.any(Object),
      );
    });
  });

  describe("getCustomersPromos", () => {
    it("returns customers and promos metrics", async () => {
      const mockMetrics = {
        totalCustomers: 500,
        newCustomers: 50,
        repeatingCustomers: 450,
        promosUsed: 100,
        averagePromoValue: 25,
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        data: { customersPromos: mockMetrics },
      });

      const result = await analyticsService.getCustomersPromos();

      expect(result).toEqual(mockMetrics);
      expect(api.get).toHaveBeenCalledWith(
        "/analytics/customers-promos",
        expect.any(Object),
      );
    });
  });

  describe("getTrends", () => {
    it("returns trends metrics", async () => {
      const mockMetrics = {
        monthlyTrend: [
          { month: "April", revenue: 50000, sales: 250 },
          { month: "May", revenue: 55000, sales: 275 },
        ],
        seasonality: [
          { period: "Spring", revenue: 100000 },
          { period: "Summer", revenue: 120000 },
        ],
        peakHours: [
          { hour: 14, sales: 50 },
          { hour: 18, sales: 60 },
        ],
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        data: { trends: mockMetrics },
      });

      const result = await analyticsService.getTrends();

      expect(result).toEqual(mockMetrics);
      expect(api.get).toHaveBeenCalledWith(
        "/analytics/trends",
        expect.any(Object),
      );
    });
  });

  describe("getFinancial", () => {
    it("returns financial metrics", async () => {
      const mockMetrics = {
        grossProfit: 5000,
        cogs: 5000,
        margin: 50,
        costOfSales: 5000,
        operatingExpense: 2000,
        netProfit: 3000,
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        data: { financial: mockMetrics },
      });

      const result = await analyticsService.getFinancial();

      expect(result).toEqual(mockMetrics);
      expect(api.get).toHaveBeenCalledWith(
        "/analytics/financial",
        expect.any(Object),
      );
    });
  });

  describe("getDiscountAnalytics", () => {
    it("returns discount metrics", async () => {
      const mockMetrics = {
        totalDiscounts: 100,
        discountPercentage: 5,
        topDiscounts: [
          { name: "SAVE10", count: 50, totalValue: 500 },
          { name: "SAVE20", count: 30, totalValue: 600 },
        ],
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        data: { discount: mockMetrics },
      });

      const result = await analyticsService.getDiscountAnalytics();

      expect(result).toEqual(mockMetrics);
    });
  });

  describe("getPaymentTrends", () => {
    it("returns payment trends metrics", async () => {
      const mockMetrics = {
        paymentMethods: [
          { method: "Credit Card", count: 300, percentage: 60 },
          { method: "Cash", count: 200, percentage: 40 },
        ],
        trend: [],
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        data: { paymentTrends: mockMetrics },
      });

      const result = await analyticsService.getPaymentTrends();

      expect(result).toEqual(mockMetrics);
    });
  });

  describe("error handling", () => {
    it("calls handleApiError on failure", async () => {
      const mockError = new Error("Network error");
      vi.mocked(api.get).mockRejectedValueOnce(mockError);

      await expect(analyticsService.getOverview()).rejects.toThrow();
    });
  });
});
