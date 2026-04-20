import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./reviews.service", () => ({
  default: {
    list: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import reviewsController from "./reviews.controller";
import * as serviceModule from "./reviews.service";
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

describe("ReviewsController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("returns 200 with rows/total/page/limit on success", async () => {
      mockService.list.mockResolvedValue({
        rows: [{ id: "r1" }],
        total: 1,
        page: 1,
        limit: 25,
      });
      const req = makeReq({ query: {} });
      const res = mockRes() as Response;

      await reviewsController.list(req, res);

      expect(mockService.list).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({ page: 1, limit: 25 }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "OK",
          rows: [{ id: "r1" }],
          total: 1,
          page: 1,
          limit: 25,
        }),
      );
    });

    it("returns 400 on Zod query validation error", async () => {
      const req = makeReq({ query: { productId: "not-a-uuid" } });
      const res = mockRes() as Response;

      await reviewsController.list(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.list).not.toHaveBeenCalled();
    });

    it("falls through to sendControllerError on unknown error", async () => {
      mockService.list.mockRejectedValue(new Error("DB down"));
      const req = makeReq({ query: {} });
      const res = mockRes() as Response;

      await reviewsController.list(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("returns 200 with review on success", async () => {
      const review = { id: "r1", status: "APPROVED" };
      mockService.update.mockResolvedValue(review);
      const req = makeReq({
        params: { id: "r1" },
        body: { status: "APPROVED" },
      });
      const res = mockRes() as Response;

      await reviewsController.update(req, res);

      expect(mockService.update).toHaveBeenCalledWith("t1", "r1", {
        status: "APPROVED",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ review }),
      );
    });

    it("returns 400 on Zod body validation error (empty patch)", async () => {
      const req = makeReq({ params: { id: "r1" }, body: {} });
      const res = mockRes() as Response;

      await reviewsController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.update).not.toHaveBeenCalled();
    });

    it("returns 404 when service throws AppError(404)", async () => {
      mockService.update.mockRejectedValue(
        createError("Review not found", 404),
      );
      const req = makeReq({
        params: { id: "missing" },
        body: { status: "APPROVED" },
      });
      const res = mockRes() as Response;

      await reviewsController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(sendControllerError).not.toHaveBeenCalled();
    });

    it("falls through to sendControllerError on unknown error", async () => {
      mockService.update.mockRejectedValue(new Error("boom"));
      const req = makeReq({
        params: { id: "r1" },
        body: { status: "APPROVED" },
      });
      const res = mockRes() as Response;

      await reviewsController.update(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("returns 200 on successful delete", async () => {
      mockService.remove.mockResolvedValue(undefined);
      const req = makeReq({ params: { id: "r1" } });
      const res = mockRes() as Response;

      await reviewsController.remove(req, res);

      expect(mockService.remove).toHaveBeenCalledWith("t1", "r1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Review deleted" }),
      );
    });

    it("returns 404 when review missing", async () => {
      mockService.remove.mockRejectedValue(
        createError("Review not found", 404),
      );
      const req = makeReq({ params: { id: "missing" } });
      const res = mockRes() as Response;

      await reviewsController.remove(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("falls through to sendControllerError on unknown error", async () => {
      mockService.remove.mockRejectedValue(new Error("boom"));
      const req = makeReq({ params: { id: "r1" } });
      const res = mockRes() as Response;

      await reviewsController.remove(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });
});
