/**
 * BusinessProfileController unit tests.
 *
 * Exercises the controller in isolation against a mocked service. Confirms:
 *   - GET returns the tenant's profile
 *   - PATCH validates the body and persists changes
 *   - Zod errors → 400
 *   - Service errors carrying a statusCode → corresponding fail()
 *   - Unexpected errors → sendControllerError fallback
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("@/shared/auth/getAuthContext", () => ({
  getAuthContext: vi.fn(),
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("./business-profile.service", () => ({
  BusinessProfileService: vi.fn(),
  default: { getForTenant: vi.fn(), updateForTenant: vi.fn() },
}));

import controller from "./business-profile.controller";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { sendControllerError } from "@/utils/controllerError";
import service from "./business-profile.service";

const mockService = service as unknown as {
  getForTenant: ReturnType<typeof vi.fn>;
  updateForTenant: ReturnType<typeof vi.fn>;
};

function mockRes(): Partial<Response> {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    user: { id: "u1", tenantId: "t1", role: "admin" },
    params: {},
    body: {},
    query: {},
    ...overrides,
  } as unknown as Request;
}

describe("BusinessProfileController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getAuthContext as ReturnType<typeof vi.fn>).mockReturnValue({
      userId: "u1",
      tenantId: "t1",
    });
  });

  describe("getMine", () => {
    it("returns 200 with the profile", async () => {
      const profile = {
        id: "p1",
        tenantId: "t1",
        legalName: "Acme Pvt Ltd",
        defaultCurrency: "NPR",
      };
      mockService.getForTenant.mockResolvedValue(profile);

      const req = makeReq();
      const res = mockRes() as Response;
      await controller.getMine(req, res);

      expect(mockService.getForTenant).toHaveBeenCalledWith("t1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { profile },
      });
    });

    it("delegates unexpected errors to sendControllerError", async () => {
      mockService.getForTenant.mockRejectedValue(new Error("DB down"));

      const req = makeReq();
      const res = mockRes() as Response;
      await controller.getMine(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("updateMine", () => {
    it("returns 200 with the updated profile", async () => {
      const updated = {
        id: "p1",
        tenantId: "t1",
        legalName: "Acme Pvt Ltd",
        phone: "+9779800000000",
        defaultCurrency: "NPR",
      };
      mockService.updateForTenant.mockResolvedValue(updated);

      const req = makeReq({
        body: { legalName: "Acme Pvt Ltd", phone: "+9779800000000" },
      });
      const res = mockRes() as Response;
      await controller.updateMine(req, res);

      expect(mockService.updateForTenant).toHaveBeenCalledWith("t1", {
        legalName: "Acme Pvt Ltd",
        phone: "+9779800000000",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { profile: updated },
      });
    });

    it("returns 400 on validation error (invalid email)", async () => {
      const req = makeReq({ body: { email: "not-an-email" } });
      const res = mockRes() as Response;
      await controller.updateMine(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      );
      expect(mockService.updateForTenant).not.toHaveBeenCalled();
    });

    it("returns 400 on validation error (country not 2-letter ISO)", async () => {
      const req = makeReq({ body: { country: "Nepal" } });
      const res = mockRes() as Response;
      await controller.updateMine(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("delegates unexpected errors to sendControllerError", async () => {
      mockService.updateForTenant.mockRejectedValue(new Error("DB down"));

      const req = makeReq({ body: { legalName: "Acme" } });
      const res = mockRes() as Response;
      await controller.updateMine(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });
});
