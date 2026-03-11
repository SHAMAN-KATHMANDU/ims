import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetDashboardData = vi.fn();
const mockGetReportsData = vi.fn();
const mockGetExportData = vi.fn();

vi.mock("./crm.repository", () => ({
  default: {
    getDashboardData: (...args: unknown[]) => mockGetDashboardData(...args),
    getReportsData: (...args: unknown[]) => mockGetReportsData(...args),
    getExportData: (...args: unknown[]) => mockGetExportData(...args),
  },
}));

import crmService from "./crm.service";

describe("CrmService", () => {
  const tenantId = "t1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDashboard", () => {
    it("transforms raw data into dashboard shape", async () => {
      mockGetDashboardData.mockResolvedValue({
        leadStats: [
          { status: "NEW", _count: 10 },
          { status: "CONVERTED", _count: 5 },
        ],
        monthlyRevenue: [
          {
            closedAt: new Date("2024-06-15"),
            value: 5000,
          },
        ],
        totalDealsValue: { _sum: { value: 50000 } },
        dealsClosingThisMonth: 3,
        tasksDueToday: 2,
        recentActivities: [{ id: "a1" }],
      });

      const result = await crmService.getDashboard(tenantId);

      expect(result.totalLeads).toBe(15);
      expect(result.convertedLeads).toBe(5);
      expect(result.leadConversionRate).toBeCloseTo(33.33);
      expect(result.totalDealsValue).toBe(50000);
      expect(result.dealsClosingThisMonth).toBe(3);
      expect(result.tasksDueToday).toBe(2);
      expect(result.monthlyRevenueChart).toHaveLength(12);
      expect(result.activitySummary).toEqual([{ id: "a1" }]);
    });

    it("handles zero leads", async () => {
      mockGetDashboardData.mockResolvedValue({
        leadStats: [],
        monthlyRevenue: [],
        totalDealsValue: { _sum: { value: 0 } },
        dealsClosingThisMonth: 0,
        tasksDueToday: 0,
        recentActivities: [],
      });

      const result = await crmService.getDashboard(tenantId);

      expect(result.totalLeads).toBe(0);
      expect(result.leadConversionRate).toBe(0);
    });
  });

  describe("getReports", () => {
    it("transforms reports data for given year", async () => {
      mockGetReportsData.mockResolvedValue({
        monthlyRevenue: [
          { closedAt: new Date("2024-03-01"), value: 10000 },
          { closedAt: new Date("2024-05-01"), value: 5000 },
        ],
        dealsWon: 10,
        dealsLost: 2,
        salesPerUser: [
          { assignedToId: "u1", _count: 5, _sum: { value: 25000 } },
        ],
        userMap: { u1: "Alice" },
        leadsBySource: [{ source: "Web", _count: 20 }],
      });

      const result = await crmService.getReports(tenantId, 2024);

      expect(result.year).toBe(2024);
      expect(result.dealsWon).toBe(10);
      expect(result.dealsLost).toBe(2);
      expect(result.totalRevenue).toBe(15000);
      expect(result.conversionRate).toBeCloseTo(83.33);
      expect(result.salesPerUser).toHaveLength(1);
      expect(result.salesPerUser[0]).toMatchObject({
        userId: "u1",
        username: "Alice",
        dealCount: 5,
        totalValue: 25000,
      });
      expect(result.leadsBySource).toEqual([{ source: "Web", count: 20 }]);
    });
  });

  describe("exportReportsExcel", () => {
    it("returns buffer from Excel workbook", async () => {
      mockGetExportData.mockResolvedValue({
        year: 2024,
        dealsWon: 10,
        dealsLost: 2,
        salesPerUser: [
          { assignedToId: "u1", _count: 5, _sum: { value: 25000 } },
        ],
        userMap: { u1: "Alice" },
        leadsBySource: [{ source: "Web", _count: 20 }],
      });

      const result = await crmService.exportReportsExcel(tenantId, 2024);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
