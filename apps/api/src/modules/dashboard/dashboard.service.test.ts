import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUserSummaryData = vi.fn();
const mockGetAdminSummaryData = vi.fn();
const mockGetSuperAdminSummaryData = vi.fn();
const mockGetCached = vi.fn();
const mockSetCached = vi.fn();
const mockGetTenantId = vi.fn();

vi.mock("./dashboard.repository", () => ({
  default: {
    getUserSummaryData: (...args: unknown[]) => mockGetUserSummaryData(...args),
    getAdminSummaryData: (...args: unknown[]) =>
      mockGetAdminSummaryData(...args),
    getSuperAdminSummaryData: (...args: unknown[]) =>
      mockGetSuperAdminSummaryData(...args),
  },
}));

vi.mock("./dashboardCache", () => ({
  getCached: (...args: unknown[]) => mockGetCached(...args),
  setCached: (...args: unknown[]) => mockSetCached(...args),
}));

vi.mock("@/config/tenantContext", () => ({
  getTenantId: () => mockGetTenantId(),
}));

import dashboardService from "./dashboard.service";

describe("DashboardService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTenantId.mockReturnValue("t1");
  });

  describe("getUserSummary", () => {
    it("returns cached result when cache hit", async () => {
      const cached = {
        mySalesToday: 5,
        myRevenueToday: 1000,
        myCreditOutstanding: 0,
      };
      mockGetCached.mockReturnValue(cached);

      const result = await dashboardService.getUserSummary("u1");

      expect(result).toEqual(cached);
      expect(mockGetUserSummaryData).not.toHaveBeenCalled();
    });

    it("fetches from repository and transforms when cache miss", async () => {
      mockGetCached.mockReturnValue(null);
      mockGetUserSummaryData.mockResolvedValue({
        creditSalesWithPayments: [],
        todayStats: { _count: 3, _sum: { total: 500 } },
        sinceLoginStats: { _count: 10, _sum: { total: 2000 } },
        today: new Date("2024-01-15"),
        PERSONAL_TREND_DAYS: 7,
        trendStart: new Date("2024-01-09"),
        salesForTrend: [],
        recentSalesList: [
          {
            id: "s1",
            saleCode: "S-001",
            total: 100,
            createdAt: new Date("2024-01-15T10:00:00Z"),
            location: { name: "Warehouse" },
          },
        ],
      });

      const result = await dashboardService.getUserSummary("u1");

      expect(result.mySalesToday).toBe(3);
      expect(result.myRevenueToday).toBe(500);
      expect(result.recentSales).toHaveLength(1);
      expect(result.recentSales[0]).toMatchObject({
        id: "s1",
        saleCode: "S-001",
        total: 100,
        locationName: "Warehouse",
      });
      expect(mockSetCached).toHaveBeenCalledWith(
        "user-summary",
        "u1",
        expect.any(Object),
      );
    });

    it("calculates credit outstanding and pending credit sales", async () => {
      mockGetCached.mockReturnValue(null);
      mockGetUserSummaryData.mockResolvedValue({
        creditSalesWithPayments: [
          {
            id: "cs1",
            saleCode: "C-001",
            total: 500,
            createdAt: new Date("2024-01-14"),
            payments: [{ amount: 200 }],
          },
        ],
        todayStats: { _count: 0, _sum: { total: 0 } },
        sinceLoginStats: { _count: 0, _sum: { total: 0 } },
        today: new Date("2024-01-15"),
        PERSONAL_TREND_DAYS: 7,
        trendStart: new Date("2024-01-09"),
        salesForTrend: [],
        recentSalesList: [],
      });

      const result = await dashboardService.getUserSummary("u1");

      expect(result.myCreditOutstanding).toBe(300);
      expect(result.pendingCreditCount).toBe(1);
      expect(result.pendingCreditSales[0]).toMatchObject({
        id: "cs1",
        saleCode: "C-001",
        total: 500,
        paidTotal: 200,
        balance: 300,
      });
      expect(result.pendingCreditSales[0].createdAt).toBe(
        "2024-01-14T00:00:00.000Z",
      );
    });
  });

  describe("getAdminSummary", () => {
    it("returns cached result when cache hit", async () => {
      const cached = {
        todayRevenue: 5000,
        creditOutstanding: 0,
        inventoryValue: 10000,
      };
      mockGetCached.mockReturnValue(cached);

      const result = await dashboardService.getAdminSummary("u1");

      expect(result).toEqual(cached);
      expect(mockGetAdminSummaryData).not.toHaveBeenCalled();
    });

    it("fetches from repository and transforms when cache miss", async () => {
      mockGetCached.mockReturnValue(null);
      mockGetAdminSummaryData.mockResolvedValue({
        allCreditSales: [],
        overdueCutoff: new Date("2024-01-01"),
        transferCounts: [
          { status: "PENDING", _count: 2 },
          { status: "COMPLETED", _count: 5 },
        ],
        inventoryRows: [],
        locations: [{ id: "loc1", name: "Warehouse" }],
        locationRevenue: [{ locationId: "loc1", _sum: { total: 3000 } }],
        todayRevenueAgg: { _sum: { total: 3000 } },
        lowStockCount: 1,
      });

      const result = await dashboardService.getAdminSummary("u1");

      expect(result.todayRevenue).toBe(3000);
      expect(result.inventoryValue).toBe(0);
      expect(result.alerts.lowStockCount).toBe(1);
      expect(result.transferStatusCounts.pending).toBe(2);
      expect(result.transferStatusCounts.completed).toBe(5);
      expect(result.locationSnapshot).toHaveLength(1);
      expect(result.locationSnapshot[0]).toMatchObject({
        locationId: "loc1",
        locationName: "Warehouse",
        revenue: 3000,
      });
      expect(mockGetTenantId).toHaveBeenCalled();
    });
  });

  describe("getSuperAdminSummary", () => {
    it("returns cached result when cache hit", async () => {
      const cached = {
        activeUsersToday: 5,
        totalWorkspaces: 1,
        errorReportsOpen: 2,
      };
      mockGetCached.mockReturnValue(cached);

      const result = await dashboardService.getSuperAdminSummary("u1");

      expect(result).toEqual(cached);
      expect(mockGetSuperAdminSummaryData).not.toHaveBeenCalled();
    });

    it("fetches from repository when cache miss", async () => {
      mockGetCached.mockReturnValue(null);
      mockGetSuperAdminSummaryData.mockResolvedValue({
        creditSalesThisWeek: [],
        creditSalesLastWeek: [],
        errorReportCounts: [
          { status: "OPEN", _count: 3 },
          { status: "RESOLVED", _count: 10 },
        ],
        auditLogs: [],
        activeUsersToday: 4,
        discountAgg: { _sum: { discount: 100 } },
        negativeStockCount: 0,
      });

      const result = await dashboardService.getSuperAdminSummary("u1");

      expect(result.activeUsersToday).toBe(4);
      expect(result.errorReportsOpen).toBe(3);
      expect(result.errorReportsResolved).toBe(10);
      expect(result.riskIndicators.highDiscountUsage).toBe(100);
      expect(result.dataIntegrity.negativeStockCount).toBe(0);
      expect(mockSetCached).toHaveBeenCalledWith(
        "superadmin-summary",
        "u1",
        expect.any(Object),
      );
    });
  });
});
