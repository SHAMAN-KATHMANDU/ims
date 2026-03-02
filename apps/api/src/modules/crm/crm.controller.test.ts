import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./crm.service", () => ({
  default: {
    getDashboard: vi.fn(),
    getReports: vi.fn(),
    exportReportsExcel: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import crmController from "./crm.controller";
import * as crmServiceModule from "./crm.service";

const mockService = crmServiceModule.default as Record<
  string,
  ReturnType<typeof vi.fn>
>;

function mockRes(): Partial<Response> {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
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

describe("CrmController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDashboard", () => {
    it("returns 200 with dashboard data on success", async () => {
      const data = { totalDealsValue: 1000 };
      mockService.getDashboard.mockResolvedValue(data);
      const req = makeReq();
      const res = mockRes() as Response;

      await crmController.getDashboard(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data }));
    });
  });

  describe("getReports", () => {
    it("returns 200 with reports data on success", async () => {
      const data = { year: 2024, dealsWon: 10 };
      mockService.getReports.mockResolvedValue(data);
      const req = makeReq({ query: { year: "2024" } });
      const res = mockRes() as Response;

      await crmController.getReports(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data }));
    });
  });

  describe("exportReportsCsv", () => {
    it("returns buffer with correct headers", async () => {
      const buffer = Buffer.from("excel");
      mockService.exportReportsExcel.mockResolvedValue(buffer);
      const req = makeReq({ query: { year: "2024" } });
      const res = mockRes() as Response;

      await crmController.exportReportsCsv(req, res);

      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        expect.stringContaining("crm-reports-2024"),
      );
      expect(res.send).toHaveBeenCalledWith(buffer);
    });
  });
});
