import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./promo.service", () => ({
  PromoService: vi.fn(),
  default: {
    create: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({ default: {} }));

import promoController from "./promo.controller";
import * as promoServiceModule from "./promo.service";
import { sendControllerError } from "@/utils/controllerError";

const mockService = promoServiceModule.default as unknown as Record<
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

describe("PromoController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createPromo", () => {
    it("returns 201 with created promo on success", async () => {
      const promo = {
        id: "p1",
        code: "SAVE10",
        valueType: "PERCENTAGE",
        value: 10,
      };
      mockService.create.mockResolvedValue(promo);
      const req = makeReq({
        body: { code: "SAVE10", valueType: "PERCENTAGE", value: 10 },
      });
      const res = mockRes() as Response;

      await promoController.createPromo(req, res);

      expect(mockService.create).toHaveBeenCalledWith("t1", expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Promo code created successfully",
          promo,
        }),
      );
    });

    it("returns 400 when code is missing (Zod validation)", async () => {
      const req = makeReq({
        body: { valueType: "PERCENTAGE", value: 10 },
      });
      const res = mockRes() as Response;

      await promoController.createPromo(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.create).not.toHaveBeenCalled();
    });

    it("returns 409 when promo code already exists", async () => {
      const err = new Error(
        "Promo code with this code already exists",
      ) as Error & {
        statusCode?: number;
      };
      err.statusCode = 409;
      mockService.create.mockRejectedValue(err);
      const req = makeReq({
        body: { code: "SAVE10", valueType: "PERCENTAGE", value: 10 },
      });
      const res = mockRes() as Response;

      await promoController.createPromo(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.any(String) }),
      );
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.create.mockRejectedValue(new Error("DB down"));
      const req = makeReq({
        body: { code: "SAVE10", valueType: "PERCENTAGE", value: 10 },
      });
      const res = mockRes() as Response;

      await promoController.createPromo(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("getAllPromos", () => {
    it("returns 200 with paginated promos on success", async () => {
      const result = {
        data: [{ id: "p1", code: "SAVE10" }],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 1 },
      };
      mockService.findAll.mockResolvedValue(result);
      const req = makeReq({ query: { page: "1", limit: "10" } });
      const res = mockRes() as Response;

      await promoController.getAllPromos(req, res);

      expect(mockService.findAll).toHaveBeenCalledWith("t1", req.query);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Promo codes fetched successfully",
          ...result,
        }),
      );
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.findAll.mockRejectedValue(new Error("DB error"));
      const req = makeReq();
      const res = mockRes() as Response;

      await promoController.getAllPromos(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("getPromoById", () => {
    it("returns 200 with promo on success", async () => {
      const promo = { id: "p1", code: "SAVE10", products: [] };
      mockService.findById.mockResolvedValue(promo);
      const req = makeReq({ params: { id: "p1" } });
      const res = mockRes() as Response;

      await promoController.getPromoById(req, res);

      expect(mockService.findById).toHaveBeenCalledWith("t1", "p1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Promo code fetched successfully",
          promo,
        }),
      );
    });

    it("returns 404 when promo not found", async () => {
      mockService.findById.mockResolvedValue(null);
      const req = makeReq({ params: { id: "p1" } });
      const res = mockRes() as Response;

      await promoController.getPromoById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Promo code not found",
      });
    });
  });

  describe("updatePromo", () => {
    it("returns 200 with updated promo on success", async () => {
      const promo = { id: "p1", code: "SAVE20", value: 20 };
      mockService.update.mockResolvedValue(promo);
      const req = makeReq({
        params: { id: "p1" },
        body: { value: 20 },
      });
      const res = mockRes() as Response;

      await promoController.updatePromo(req, res);

      expect(mockService.update).toHaveBeenCalledWith(
        "t1",
        "p1",
        expect.any(Object),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Promo code updated successfully",
          promo,
        }),
      );
    });

    it("returns 404 when promo not found", async () => {
      mockService.update.mockResolvedValue(null);
      const req = makeReq({ params: { id: "p1" }, body: { value: 20 } });
      const res = mockRes() as Response;

      await promoController.updatePromo(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Promo code not found",
      });
    });

    it("returns 400 on validation error", async () => {
      const req = makeReq({
        params: { id: "p1" },
        body: { code: "" },
      });
      const res = mockRes() as Response;

      await promoController.updatePromo(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.update).not.toHaveBeenCalled();
    });
  });

  describe("deletePromo", () => {
    it("returns 200 on success", async () => {
      mockService.delete.mockResolvedValue({});
      const req = makeReq({ params: { id: "p1" } });
      const res = mockRes() as Response;

      await promoController.deletePromo(req, res);

      expect(mockService.delete).toHaveBeenCalledWith("t1", "p1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Promo code deactivated successfully",
      });
    });

    it("returns 404 when promo not found", async () => {
      mockService.delete.mockResolvedValue(null);
      const req = makeReq({ params: { id: "p1" } });
      const res = mockRes() as Response;

      await promoController.deletePromo(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Promo code not found",
      });
    });
  });
});
