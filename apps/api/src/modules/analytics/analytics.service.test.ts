import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSalesRevenueData = vi.fn();
const mockGetFinancialData = vi.fn();

vi.mock("./analytics.repository", () => ({
  default: {
    getSalesRevenueData: (...args: unknown[]) =>
      mockGetSalesRevenueData(...args),
    getFinancialData: (...args: unknown[]) => mockGetFinancialData(...args),
  },
}));

import analyticsService from "./analytics.service";

describe("AnalyticsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSalesRevenue", () => {
    it("returns KPIs and timeSeries where sum(timeSeries.gross) equals totalRevenue and sum(timeSeries.net) equals netRevenue", async () => {
      const salesForTimeSeries = [
        {
          subtotal: 100,
          total: 90,
          discount: 10,
          createdAt: new Date("2024-01-01T12:00:00Z"),
        },
        {
          subtotal: 200,
          total: 180,
          discount: 20,
          createdAt: new Date("2024-01-02T12:00:00Z"),
        },
      ];
      mockGetSalesRevenueData.mockResolvedValue({
        kpisAgg: {
          _sum: { subtotal: 300, total: 270, discount: 30 },
          _count: 2,
        },
        salesForTimeSeries,
        compositionByLocation: [],
        compositionByPayment: [],
        compositionByType: [],
        creditSalesForOutstanding: [],
        creditSalesForAging: [],
        paymentsBySaleId: [],
        paymentsForCreditByDate: [],
        userPerformanceRaw: [],
        locations: [],
        users: [],
      });

      const data = await analyticsService.getSalesRevenue(
        {},
        "admin",
        "u1",
        "t1",
      );

      expect(data.kpis.totalRevenue).toBe(300);
      expect(data.kpis.netRevenue).toBe(270);
      const sumGross = data.timeSeries.reduce((s, d) => s + d.gross, 0);
      const sumNet = data.timeSeries.reduce((s, d) => s + d.net, 0);
      expect(sumGross).toBe(data.kpis.totalRevenue);
      expect(sumNet).toBe(data.kpis.netRevenue);
    });
  });

  describe("getFinancial", () => {
    it("returns grossProfitTimeSeries where sum(revenue) equals total net revenue from sale totals (consistent with Sales & Revenue)", async () => {
      const d = "2024-01-01";
      const saleItems = [
        {
          quantity: 2,
          lineTotal: 90,
          variation: {
            product: {
              costPrice: 30,
              category: { name: "A" },
            },
          },
          sale: {
            id: "s1",
            createdAt: new Date(`${d}T12:00:00Z`),
            locationId: "loc1",
            discount: 10,
            subtotal: 100,
            total: 90,
          },
        },
        {
          quantity: 1,
          lineTotal: 80,
          variation: {
            product: {
              costPrice: 40,
              category: { name: "B" },
            },
          },
          sale: {
            id: "s2",
            createdAt: new Date(`${d}T12:00:00Z`),
            locationId: "loc1",
            discount: 20,
            subtotal: 100,
            total: 80,
          },
        },
      ];
      mockGetFinancialData.mockResolvedValue({
        saleItems,
        locations: [{ id: "loc1", name: "Store 1" }],
      });

      const data = await analyticsService.getFinancial({}, "admin", "u1", "t1");

      const sumRevenue = data.grossProfitTimeSeries.reduce(
        (s, p) => s + p.revenue,
        0,
      );
      expect(sumRevenue).toBe(90 + 80);
    });
  });

  describe("getSalesRevenue (graph sanity)", () => {
    it("returns timeSeries sorted by date with non-negative gross, net, discount", async () => {
      mockGetSalesRevenueData.mockResolvedValue({
        kpisAgg: {
          _sum: { subtotal: 100, total: 90, discount: 10 },
          _count: 1,
        },
        salesForTimeSeries: [
          {
            subtotal: 100,
            total: 90,
            discount: 10,
            createdAt: new Date("2024-01-02T12:00:00Z"),
          },
          {
            subtotal: 0,
            total: 0,
            discount: 0,
            createdAt: new Date("2024-01-01T12:00:00Z"),
          },
        ],
        compositionByLocation: [],
        compositionByPayment: [],
        compositionByType: [],
        creditSalesForOutstanding: [],
        creditSalesForAging: [],
        paymentsBySaleId: [],
        paymentsForCreditByDate: [],
        userPerformanceRaw: [],
        locations: [],
        users: [],
      });

      const data = await analyticsService.getSalesRevenue(
        {},
        "admin",
        "u1",
        "t1",
      );

      const ts = data.timeSeries;
      expect(ts.length).toBeGreaterThanOrEqual(1);
      for (let i = 1; i < ts.length; i++) {
        expect(ts[i].date >= ts[i - 1].date).toBe(true);
      }
      for (const row of ts) {
        expect(row.gross).toBeGreaterThanOrEqual(0);
        expect(row.net).toBeGreaterThanOrEqual(0);
        expect(row.discount).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
