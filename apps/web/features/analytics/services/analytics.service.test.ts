import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSalesRevenue, getInventoryOps } from "./analytics.service";

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

describe("analytics.service", () => {
  describe("getSalesRevenue", () => {
    it("calls GET /analytics/sales-revenue with query params", async () => {
      mockGet.mockResolvedValue({
        data: {
          data: {
            kpis: {},
            timeSeries: [],
            composition: {
              byLocation: [],
              byPaymentMethod: [],
              bySaleType: [],
            },
            credit: {
              timeSeries: [],
              aging: { "0-7": 0, "8-30": 0, "30+": 0 },
            },
            userPerformance: [],
          },
        },
      });

      await getSalesRevenue({ dateFrom: "2025-01-01", dateTo: "2025-01-31" });

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("/analytics/sales-revenue"),
      );
    });
  });

  describe("getInventoryOps", () => {
    it("calls GET /analytics/inventory-ops", async () => {
      mockGet.mockResolvedValue({
        data: {
          data: {
            kpis: {},
            healthQuadrant: [],
            heatmap: [],
            aging: {},
            transferFunnel: {},
            avgTransferCompletionDays: 0,
          },
        },
      });

      await getInventoryOps();

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("/analytics/inventory-ops"),
      );
    });
  });
});
