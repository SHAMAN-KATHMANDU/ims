import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./tenant-settings.service", () => ({
  default: {
    getPaymentMethods: vi.fn(),
    upsertPaymentMethods: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import tenantSettingsController from "./tenant-settings.controller";
import * as serviceModule from "./tenant-settings.service";
import { sendControllerError } from "@/utils/controllerError";

const mockService = serviceModule.default as unknown as Record<
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

describe("TenantSettingsController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPaymentMethods", () => {
    it("returns 200 with payment methods", async () => {
      const paymentMethods = [
        { id: "pm_cash", code: "CASH", label: "Cash", enabled: true, order: 0 },
      ];
      mockService.getPaymentMethods.mockResolvedValue({ paymentMethods });
      const req = makeReq();
      const res = mockRes() as Response;

      await tenantSettingsController.getPaymentMethods(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ paymentMethods }),
      );
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.getPaymentMethods.mockRejectedValue(new Error("DB down"));
      const req = makeReq();
      const res = mockRes() as Response;

      await tenantSettingsController.getPaymentMethods(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("upsertPaymentMethods", () => {
    it("returns 200 on successful update", async () => {
      const paymentMethods = [
        { id: "pm_card", code: "CARD", label: "Card", enabled: true, order: 0 },
      ];
      mockService.upsertPaymentMethods.mockResolvedValue({ paymentMethods });
      const req = makeReq({ body: { paymentMethods } });
      const res = mockRes() as Response;

      await tenantSettingsController.upsertPaymentMethods(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ paymentMethods }),
      );
    });

    it("returns 400 for validation error", async () => {
      const req = makeReq({ body: { paymentMethods: [] } });
      const res = mockRes() as Response;

      await tenantSettingsController.upsertPaymentMethods(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
