import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./analytics.service", () => ({
  default: {
    getOverview: vi.fn(),
    getSalesRevenue: vi.fn(),
    getInventoryOps: vi.fn(),
    getCustomersPromos: vi.fn(),
    getDiscountAnalytics: vi.fn(),
    getPaymentTrends: vi.fn(),
    getLocationComparison: vi.fn(),
    getSalesExtended: vi.fn(),
    getProductInsights: vi.fn(),
    getInventoryExtended: vi.fn(),
    getCustomerInsights: vi.fn(),
    getTrends: vi.fn(),
    getFinancial: vi.fn(),
    getMemberCohort: vi.fn(),
    exportAnalytics: vi.fn(),
  },
}));

vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));

vi.mock("@/config/tenantContext", () => ({
  getTenantId: vi.fn().mockReturnValue(null),
}));

import analyticsController from "./analytics.controller";
import * as analyticsServiceModule from "./analytics.service";
import { sendControllerError } from "@/utils/controllerError";

const mockService = analyticsServiceModule.default as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>;

function mockRes(): Partial<Response> {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  };
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    user: { id: "u1", tenantId: "t1", role: "admin", tenantSlug: "acme" },
    params: {},
    body: {},
    query: {},
    ...overrides,
  } as unknown as Request;
}

describe("AnalyticsController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getOverview", () => {
    it("returns 200 with analytics on success", async () => {
      const analytics = {
        overview: {
          totalProducts: 10,
          totalUsers: 5,
          totalValue: "100.00",
          averageProductPrice: "10.00",
        },
        usersByRole: [],
        recentProducts: [],
        recentUsers: [],
      };
      mockService.getOverview.mockResolvedValue(analytics);
      const req = makeReq();
      const res = mockRes() as Response;

      await analyticsController.getOverview(req, res);

      expect(mockService.getOverview).toHaveBeenCalledWith("t1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Analytics fetched successfully",
        analytics,
      });
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.getOverview.mockRejectedValue(new Error("DB down"));
      const req = makeReq();
      const res = mockRes() as Response;

      await analyticsController.getOverview(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("getSalesRevenue", () => {
    it("returns 200 with sales revenue data on success", async () => {
      const data = {
        kpis: { totalRevenue: 1000, netRevenue: 900, salesCount: 10 },
        timeSeries: [],
        composition: { byLocation: [], byPaymentMethod: [], bySaleType: [] },
        credit: { timeSeries: [], aging: { "0-7": 0, "8-30": 0, "30+": 0 } },
        userPerformance: [],
      };
      mockService.getSalesRevenue.mockResolvedValue(data);
      const req = makeReq({ query: { dateFrom: "2024-01-01" } });
      const res = mockRes() as Response;

      await analyticsController.getSalesRevenue(req, res);

      expect(mockService.getSalesRevenue).toHaveBeenCalledWith(
        { dateFrom: "2024-01-01" },
        "admin",
        "u1",
        "t1",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Sales revenue analytics fetched",
        data,
      });
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.getSalesRevenue.mockRejectedValue(new Error("DB down"));
      const req = makeReq();
      const res = mockRes() as Response;

      await analyticsController.getSalesRevenue(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });
});
