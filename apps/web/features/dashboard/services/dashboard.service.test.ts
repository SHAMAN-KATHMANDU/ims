import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getDashboardUserSummary,
  getDashboardAdminSummary,
} from "./dashboard.service";

const mockGet = vi.fn();

vi.mock("@/lib/axios", () => ({
  default: { get: (...args: unknown[]) => mockGet(...args) },
}));

vi.mock("@/lib/api-error", () => ({
  handleApiError: vi.fn((err: unknown) => {
    throw err;
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("dashboard.service", () => {
  describe("getDashboardUserSummary", () => {
    it("calls GET /dashboard/user-summary", async () => {
      mockGet.mockResolvedValue({
        data: {
          data: {
            mySalesToday: 0,
            myRevenueToday: 0,
            myCreditOutstanding: 0,
            sinceLastLogin: { salesCount: 0, revenue: 0 },
            pendingCreditCount: 0,
            pendingCreditSales: [],
            recentSales: [],
            personalTrend: [],
          },
        },
      });

      await getDashboardUserSummary();

      expect(mockGet).toHaveBeenCalledWith("/dashboard/user-summary");
    });
  });

  describe("getDashboardAdminSummary", () => {
    it("calls GET /dashboard/admin-summary", async () => {
      mockGet.mockResolvedValue({
        data: {
          data: {
            todayRevenue: 0,
            netRevenue: 0,
            creditOutstanding: 0,
            inventoryValue: 0,
            alerts: {
              lowStockCount: 0,
              overdueCreditCount: 0,
              failedTransferCount: 0,
            },
            locationSnapshot: [],
            transferStatusCounts: {
              pending: 0,
              inTransit: 0,
              completed: 0,
              cancelled: 0,
            },
            lowStockCount: 0,
          },
        },
      });

      await getDashboardAdminSummary();

      expect(mockGet).toHaveBeenCalledWith("/dashboard/admin-summary");
    });
  });
});
