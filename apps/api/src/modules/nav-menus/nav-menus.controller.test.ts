import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./nav-menus.service", () => ({
  default: {
    list: vi.fn(),
    getBySlot: vi.fn(),
    upsert: vi.fn(),
    deleteBySlot: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/shared/auth/getAuthContext", () => ({
  getAuthContext: vi.fn(() => ({ id: "u1", tenantId: "t1", role: "admin" })),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import controller from "./nav-menus.controller";
import * as serviceModule from "./nav-menus.service";
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

const sampleMenu = {
  id: "nm1",
  tenantId: "t1",
  slot: "header-primary",
  items: { items: [] },
};

describe("NavMenusController", () => {
  beforeEach(() => vi.clearAllMocks());

  // -------------------------------------------------------------------------
  describe("list", () => {
    it("returns 200 with menus array", async () => {
      mockService.list.mockResolvedValue([sampleMenu]);
      const req = makeReq();
      const res = mockRes() as Response;

      await controller.list(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ menus: [sampleMenu] }),
      );
    });

    it("returns 403 when website feature is disabled", async () => {
      mockService.list.mockRejectedValue(
        Object.assign(new Error("Website feature is disabled"), {
          statusCode: 403,
        }),
      );
      const req = makeReq();
      const res = mockRes() as Response;

      await controller.list(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.list.mockRejectedValue(new Error("DB down"));
      const req = makeReq();
      const res = mockRes() as Response;

      await controller.list(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe("getBySlot", () => {
    it("returns 200 with menu when found", async () => {
      mockService.getBySlot.mockResolvedValue(sampleMenu);
      const req = makeReq({ params: { slot: "header-primary" } });
      const res = mockRes() as Response;

      await controller.getBySlot(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ menu: sampleMenu }),
      );
    });

    it("returns 404 when menu not found for slot", async () => {
      mockService.getBySlot.mockResolvedValue(null);
      const req = makeReq({ params: { slot: "footer-1" } });
      const res = mockRes() as Response;

      await controller.getBySlot(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 for an invalid slot name", async () => {
      const req = makeReq({ params: { slot: "not-a-slot" } });
      const res = mockRes() as Response;

      await controller.getBySlot(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.getBySlot).not.toHaveBeenCalled();
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.getBySlot.mockRejectedValue(new Error("Crash"));
      const req = makeReq({ params: { slot: "footer-1" } });
      const res = mockRes() as Response;

      await controller.getBySlot(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe("upsert", () => {
    it("returns 200 with saved menu", async () => {
      mockService.upsert.mockResolvedValue(sampleMenu);
      const req = makeReq({
        body: { slot: "header-primary", items: { items: [] } },
      });
      const res = mockRes() as Response;

      await controller.upsert(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ menu: sampleMenu }),
      );
    });

    it("returns 400 for invalid body (bad slot)", async () => {
      const req = makeReq({
        body: { slot: "not-real", items: { items: [] } },
      });
      const res = mockRes() as Response;

      await controller.upsert(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.upsert).not.toHaveBeenCalled();
    });

    it("returns 403 when website feature is disabled", async () => {
      mockService.upsert.mockRejectedValue(
        Object.assign(new Error("Disabled"), { statusCode: 403 }),
      );
      const req = makeReq({
        body: { slot: "footer-1", items: { items: [] } },
      });
      const res = mockRes() as Response;

      await controller.upsert(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.upsert.mockRejectedValue(new Error("Crash"));
      const req = makeReq({
        body: { slot: "footer-1", items: { items: [] } },
      });
      const res = mockRes() as Response;

      await controller.upsert(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe("remove", () => {
    it("returns 200 on successful delete", async () => {
      mockService.deleteBySlot.mockResolvedValue(undefined);
      const req = makeReq({ params: { slot: "footer-1" } });
      const res = mockRes() as Response;

      await controller.remove(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 400 for invalid slot", async () => {
      const req = makeReq({ params: { slot: "invalid" } });
      const res = mockRes() as Response;

      await controller.remove(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.deleteBySlot).not.toHaveBeenCalled();
    });

    it("returns 404 when menu does not exist", async () => {
      mockService.deleteBySlot.mockRejectedValue(
        Object.assign(new Error("Nav menu not found"), { statusCode: 404 }),
      );
      const req = makeReq({ params: { slot: "footer-2" } });
      const res = mockRes() as Response;

      await controller.remove(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.deleteBySlot.mockRejectedValue(new Error("Crash"));
      const req = makeReq({ params: { slot: "footer-1" } });
      const res = mockRes() as Response;

      await controller.remove(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });
});
