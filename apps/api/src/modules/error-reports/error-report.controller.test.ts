import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./error-report.service", () => ({
  ErrorReportService: vi.fn(),
  default: {
    create: vi.fn(),
    list: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({ default: {} }));

import errorReportController from "./error-report.controller";
import * as errorReportServiceModule from "./error-report.service";

const mockService = errorReportServiceModule.default as unknown as Record<
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

describe("ErrorReportController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("returns 201 with report on success", async () => {
      const report = { id: "r1", title: "Bug" };
      mockService.create.mockResolvedValue(report);
      const req = makeReq({ body: { title: "Bug" } });
      const res = mockRes() as Response;

      await errorReportController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ report }),
      );
    });

    it("creates report when user is platformAdmin", async () => {
      const report = { id: "r1", title: "Bug" };
      mockService.create.mockResolvedValue(report);
      const req = makeReq({
        user: { id: "u1", tenantId: "t1", role: "platformAdmin", tenantSlug: "acme" },
        body: { title: "Bug" },
      });
      const res = mockRes() as Response;

      await errorReportController.create(req, res);

      expect(mockService.create).toHaveBeenCalledWith(
        "t1",
        "u1",
        expect.objectContaining({ title: "Bug" }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe("list", () => {
    it("returns 200 with paginated reports", async () => {
      const result = { data: [], pagination: {} };
      mockService.list.mockResolvedValue(result);
      const req = makeReq();
      const res = mockRes() as Response;

      await errorReportController.list(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("passes null for tenantId when user is platformAdmin (cross-tenant view)", async () => {
      const result = { data: [], pagination: {} };
      mockService.list.mockResolvedValue(result);
      const req = makeReq({
        user: { id: "u1", tenantId: "t1", role: "platformAdmin", tenantSlug: "acme" },
      });
      const res = mockRes() as Response;

      await errorReportController.list(req, res);

      expect(mockService.list).toHaveBeenCalledWith(null, expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("passes tenantId when user is not platformAdmin", async () => {
      const result = { data: [], pagination: {} };
      mockService.list.mockResolvedValue(result);
      const req = makeReq({
        user: { id: "u1", tenantId: "t1", role: "admin", tenantSlug: "acme" },
      });
      const res = mockRes() as Response;

      await errorReportController.list(req, res);

      expect(mockService.list).toHaveBeenCalledWith("t1", expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("updateStatus", () => {
    it("returns 200 with updated report", async () => {
      const report = { id: "r1", status: "RESOLVED" };
      mockService.updateStatus.mockResolvedValue(report);
      const req = makeReq({
        params: { id: "r1" },
        body: { status: "RESOLVED" },
      });
      const res = mockRes() as Response;

      await errorReportController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
