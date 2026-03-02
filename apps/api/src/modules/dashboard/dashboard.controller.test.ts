import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./dashboard.service", () => ({
  default: {
    getUserSummary: vi.fn(),
    getAdminSummary: vi.fn(),
    getSuperAdminSummary: vi.fn(),
  },
}));

vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));

import dashboardController from "./dashboard.controller";
import dashboardService from "./dashboard.service";

const mockService = dashboardService as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>;

function mockRes(): Partial<Response> {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
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

describe("DashboardController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUserSummary", () => {
    it("returns 401 when user not authenticated", async () => {
      const req = makeReq({ user: undefined });
      const res = mockRes() as Response;

      await dashboardController.getUserSummary(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(mockService.getUserSummary).not.toHaveBeenCalled();
    });

    it("returns 200 with data on success", async () => {
      const data = { mySalesToday: 5, myRevenueToday: 100 } as any;
      mockService.getUserSummary.mockResolvedValue(data);
      const req = makeReq();
      const res = mockRes() as Response;

      await dashboardController.getUserSummary(req, res);

      expect(mockService.getUserSummary).toHaveBeenCalledWith("u1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "OK", data });
    });
  });

  describe("getAdminSummary", () => {
    it("returns 401 when user not authenticated", async () => {
      const req = makeReq({ user: undefined });
      const res = mockRes() as Response;

      await dashboardController.getAdminSummary(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 200 with data on success", async () => {
      const data = { todayRevenue: 1000 } as any;
      mockService.getAdminSummary.mockResolvedValue(data);
      const req = makeReq();
      const res = mockRes() as Response;

      await dashboardController.getAdminSummary(req, res);

      expect(mockService.getAdminSummary).toHaveBeenCalledWith("u1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "OK", data });
    });
  });

  describe("getSuperAdminSummary", () => {
    it("returns 401 when user not authenticated", async () => {
      const req = makeReq({ user: undefined });
      const res = mockRes() as Response;

      await dashboardController.getSuperAdminSummary(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 200 with data on success", async () => {
      const data = { activeUsersToday: 10 } as any;
      mockService.getSuperAdminSummary.mockResolvedValue(data);
      const req = makeReq();
      const res = mockRes() as Response;

      await dashboardController.getSuperAdminSummary(req, res);

      expect(mockService.getSuperAdminSummary).toHaveBeenCalledWith("u1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "OK", data });
    });
  });
});
