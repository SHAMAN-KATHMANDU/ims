import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./audit.service", () => ({
  AuditService: vi.fn(),
  default: {
    getAuditLogs: vi.fn(),
  },
}));

vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({ default: {} }));

import auditController from "./audit.controller";
import * as auditServiceModule from "./audit.service";
import { sendControllerError } from "@/utils/controllerError";

const mockService = auditServiceModule.default as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>;

function mockRes(): Partial<Response> {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
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

describe("AuditController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAuditLogs", () => {
    it("returns 200 with paginated audit logs on success", async () => {
      const result = {
        data: [{ id: "a1", action: "CREATE" }],
        pagination: { currentPage: 1, totalItems: 1, totalPages: 1 },
      };
      mockService.getAuditLogs.mockResolvedValue(result);
      const req = makeReq({ query: { page: "1", limit: "10" } });
      const res = mockRes() as Response;

      await auditController.getAuditLogs(req, res);

      expect(mockService.getAuditLogs).toHaveBeenCalledWith("t1", req.query);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Audit logs fetched",
          data: result.data,
          pagination: result.pagination,
        }),
      );
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.getAuditLogs.mockRejectedValue(new Error("DB error"));
      const req = makeReq();
      const res = mockRes() as Response;

      await auditController.getAuditLogs(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });
});
