import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./gift-card.service", () => ({
  GiftCardService: vi.fn(),
  default: {
    create: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    redeem: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import giftCardController from "./gift-card.controller";
import * as serviceModule from "./gift-card.service";
import { sendControllerError } from "@/utils/controllerError";
import { createError } from "@/middlewares/errorHandler";

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

describe("GiftCardController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createGiftCard", () => {
    const validBody = { code: "CARD-001", amount: 5000 };

    it("returns 201 with created gift card on success", async () => {
      const giftCard = {
        id: "g1",
        code: "CARD-001",
        amount: 5000,
        balance: 5000,
      };
      mockService.create.mockResolvedValue(giftCard);
      const req = makeReq({ body: validBody });
      const res = mockRes() as Response;

      await giftCardController.createGiftCard(req, res);

      expect(mockService.create).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({ code: "CARD-001", amount: 5000 }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ giftCard }),
      );
    });

    it("returns 400 on Zod validation error", async () => {
      const req = makeReq({ body: { code: "bad!", amount: -5 } });
      const res = mockRes() as Response;

      await giftCardController.createGiftCard(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.create).not.toHaveBeenCalled();
    });

    it("returns 409 when service throws AppError(409)", async () => {
      mockService.create.mockRejectedValue(createError("code exists", 409));
      const req = makeReq({ body: validBody });
      const res = mockRes() as Response;

      await giftCardController.createGiftCard(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(sendControllerError).not.toHaveBeenCalled();
    });

    it("falls back to sendControllerError on unexpected error", async () => {
      mockService.create.mockRejectedValue(new Error("DB down"));
      const req = makeReq({ body: validBody });
      const res = mockRes() as Response;

      await giftCardController.createGiftCard(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("getAllGiftCards", () => {
    it("returns 200 with gift cards", async () => {
      mockService.findAll.mockResolvedValue({
        items: [{ id: "g1" }],
        totalItems: 1,
      });
      const req = makeReq({ query: { limit: "10" } });
      const res = mockRes() as Response;

      await giftCardController.getAllGiftCards(req, res);

      expect(mockService.findAll).toHaveBeenCalledWith("t1", { limit: "10" });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("falls back to sendControllerError on unexpected error", async () => {
      mockService.findAll.mockRejectedValue(new Error("boom"));
      const req = makeReq();
      const res = mockRes() as Response;

      await giftCardController.getAllGiftCards(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("getGiftCardById", () => {
    it("returns 200 with gift card on success", async () => {
      mockService.findById.mockResolvedValue({ id: "g1" });
      const req = makeReq({ params: { id: "g1" } });
      const res = mockRes() as Response;

      await giftCardController.getGiftCardById(req, res);

      expect(mockService.findById).toHaveBeenCalledWith("t1", "g1");
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 404 when service returns null", async () => {
      mockService.findById.mockResolvedValue(null);
      const req = makeReq({ params: { id: "missing" } });
      const res = mockRes() as Response;

      await giftCardController.getGiftCardById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("handles array-valued id param by taking the first element", async () => {
      mockService.findById.mockResolvedValue({ id: "g1" });
      const req = makeReq({
        params: { id: ["g1", "extra"] as unknown as string },
      });
      const res = mockRes() as Response;

      await giftCardController.getGiftCardById(req, res);

      expect(mockService.findById).toHaveBeenCalledWith("t1", "g1");
    });
  });

  describe("updateGiftCard", () => {
    it("returns 200 with updated gift card", async () => {
      mockService.update.mockResolvedValue({ id: "g1", status: "VOIDED" });
      const req = makeReq({
        params: { id: "g1" },
        body: { status: "VOIDED" },
      });
      const res = mockRes() as Response;

      await giftCardController.updateGiftCard(req, res);

      expect(mockService.update).toHaveBeenCalledWith(
        "t1",
        "g1",
        expect.objectContaining({ status: "VOIDED" }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 404 when service returns null", async () => {
      mockService.update.mockResolvedValue(null);
      const req = makeReq({
        params: { id: "missing" },
        body: { status: "VOIDED" },
      });
      const res = mockRes() as Response;

      await giftCardController.updateGiftCard(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 on Zod validation error", async () => {
      const req = makeReq({
        params: { id: "g1" },
        body: { status: "WEIRD" },
      });
      const res = mockRes() as Response;

      await giftCardController.updateGiftCard(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.update).not.toHaveBeenCalled();
    });

    it("returns 400 when service throws AppError(400) on balance-too-high", async () => {
      mockService.update.mockRejectedValue(
        createError("Balance cannot exceed original amount", 400),
      );
      const req = makeReq({
        params: { id: "g1" },
        body: { balance: 99999 },
      });
      const res = mockRes() as Response;

      await giftCardController.updateGiftCard(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(sendControllerError).not.toHaveBeenCalled();
    });

    it("falls back to sendControllerError on unexpected error", async () => {
      mockService.update.mockRejectedValue(new Error("boom"));
      const req = makeReq({
        params: { id: "g1" },
        body: { status: "VOIDED" },
      });
      const res = mockRes() as Response;

      await giftCardController.updateGiftCard(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("redeemGiftCard", () => {
    const validRedeemBody = { code: "CARD-001", amount: 500 };

    it("returns 200 with redeemed result on success", async () => {
      mockService.redeem.mockResolvedValue({
        id: "g1",
        code: "CARD-001",
        balance: 4500,
        status: "ACTIVE",
      });
      const req = makeReq({ body: validRedeemBody });
      const res = mockRes() as Response;

      await giftCardController.redeemGiftCard(req, res);

      expect(mockService.redeem).toHaveBeenCalledWith("t1", "CARD-001", 500);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ balance: 4500, status: "ACTIVE" }),
      );
    });

    it("returns 404 when service throws AppError(404)", async () => {
      mockService.redeem.mockRejectedValue(
        createError("Gift card not found", 404),
      );
      const req = makeReq({ body: validRedeemBody });
      const res = mockRes() as Response;

      await giftCardController.redeemGiftCard(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(sendControllerError).not.toHaveBeenCalled();
    });

    it("returns 409 when service throws AppError(409) for expired card", async () => {
      mockService.redeem.mockRejectedValue(
        createError("Gift card is expired", 409),
      );
      const req = makeReq({ body: validRedeemBody });
      const res = mockRes() as Response;

      await giftCardController.redeemGiftCard(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("returns 409 when service throws AppError(409) for insufficient balance", async () => {
      mockService.redeem.mockRejectedValue(
        createError("Insufficient gift card balance", 409),
      );
      const req = makeReq({ body: validRedeemBody });
      const res = mockRes() as Response;

      await giftCardController.redeemGiftCard(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("returns 400 on Zod validation error (short code)", async () => {
      const req = makeReq({ body: { code: "X", amount: 100 } });
      const res = mockRes() as Response;

      await giftCardController.redeemGiftCard(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.redeem).not.toHaveBeenCalled();
    });

    it("returns 400 on Zod validation error (non-positive amount)", async () => {
      const req = makeReq({ body: { code: "CARD-001", amount: 0 } });
      const res = mockRes() as Response;

      await giftCardController.redeemGiftCard(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.redeem).not.toHaveBeenCalled();
    });

    it("falls back to sendControllerError on unexpected error", async () => {
      mockService.redeem.mockRejectedValue(new Error("DB exploded"));
      const req = makeReq({ body: validRedeemBody });
      const res = mockRes() as Response;

      await giftCardController.redeemGiftCard(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });
});
