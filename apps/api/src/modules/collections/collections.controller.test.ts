import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./collections.service", () => ({
  default: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    setProducts: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));
vi.mock("@/shared/auth/getAuthContext", () => ({
  getAuthContext: vi.fn(() => ({
    tenantId: "t1",
    userId: "u1",
    role: "admin",
  })),
}));

import controller from "./collections.controller";
import * as serviceModule from "./collections.service";
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
    params: {},
    body: {},
    query: {},
    ...overrides,
  } as unknown as Request;
}

describe("CollectionsController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("returns 200 with collections on success", async () => {
      mockService.list.mockResolvedValue([{ id: "c1", productCount: 3 }]);
      const req = makeReq();
      const res = mockRes() as Response;

      await controller.list(req, res);

      expect(mockService.list).toHaveBeenCalledWith("t1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          collections: [{ id: "c1", productCount: 3 }],
        }),
      );
    });

    it("returns matching status when service throws AppError", async () => {
      mockService.list.mockRejectedValue(createError("Website disabled", 403));
      const req = makeReq();
      const res = mockRes() as Response;

      await controller.list(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(sendControllerError).not.toHaveBeenCalled();
    });

    it("falls back to sendControllerError on unexpected error", async () => {
      mockService.list.mockRejectedValue(new Error("DB down"));
      const req = makeReq();
      const res = mockRes() as Response;

      await controller.list(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("get", () => {
    it("returns 200 with collection on success", async () => {
      mockService.get.mockResolvedValue({ id: "c1", productIds: ["p1"] });
      const req = makeReq({ params: { id: "c1" } });
      const res = mockRes() as Response;

      await controller.get(req, res);

      expect(mockService.get).toHaveBeenCalledWith("t1", "c1");
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 404 when service throws AppError(404)", async () => {
      mockService.get.mockRejectedValue(
        createError("Collection not found", 404),
      );
      const req = makeReq({ params: { id: "missing" } });
      const res = mockRes() as Response;

      await controller.get(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("create", () => {
    it("returns 201 with created collection", async () => {
      const collection = { id: "c1", slug: "featured", title: "Featured" };
      mockService.create.mockResolvedValue(collection);
      const req = makeReq({
        body: { slug: "featured", title: "Featured" },
      });
      const res = mockRes() as Response;

      await controller.create(req, res);

      expect(mockService.create).toHaveBeenCalledWith("t1", {
        slug: "featured",
        title: "Featured",
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ collection }),
      );
    });

    it("returns 400 on Zod validation error", async () => {
      const req = makeReq({ body: { slug: "Bad Slug", title: "" } });
      const res = mockRes() as Response;

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.create).not.toHaveBeenCalled();
    });

    it("returns 409 when service throws AppError(409)", async () => {
      mockService.create.mockRejectedValue(createError("slug exists", 409));
      const req = makeReq({
        body: { slug: "featured", title: "Featured" },
      });
      const res = mockRes() as Response;

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(sendControllerError).not.toHaveBeenCalled();
    });

    it("falls back to sendControllerError on unexpected error", async () => {
      mockService.create.mockRejectedValue(new Error("boom"));
      const req = makeReq({
        body: { slug: "featured", title: "Featured" },
      });
      const res = mockRes() as Response;

      await controller.create(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("returns 200 with updated collection", async () => {
      const collection = { id: "c1", slug: "featured", title: "Renamed" };
      mockService.update.mockResolvedValue(collection);
      const req = makeReq({
        params: { id: "c1" },
        body: { title: "Renamed" },
      });
      const res = mockRes() as Response;

      await controller.update(req, res);

      expect(mockService.update).toHaveBeenCalledWith("t1", "c1", {
        title: "Renamed",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ collection }),
      );
    });

    it("returns 400 on Zod validation error (empty patch)", async () => {
      const req = makeReq({ params: { id: "c1" }, body: {} });
      const res = mockRes() as Response;

      await controller.update(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.update).not.toHaveBeenCalled();
    });

    it("returns 404 when service throws AppError(404)", async () => {
      mockService.update.mockRejectedValue(
        createError("Collection not found", 404),
      );
      const req = makeReq({
        params: { id: "missing" },
        body: { title: "New" },
      });
      const res = mockRes() as Response;

      await controller.update(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("remove", () => {
    it("returns 200 on successful delete", async () => {
      mockService.remove.mockResolvedValue(undefined);
      const req = makeReq({ params: { id: "c1" } });
      const res = mockRes() as Response;

      await controller.remove(req, res);

      expect(mockService.remove).toHaveBeenCalledWith("t1", "c1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Collection deleted" }),
      );
    });

    it("returns 404 when collection missing", async () => {
      mockService.remove.mockRejectedValue(
        createError("Collection not found", 404),
      );
      const req = makeReq({ params: { id: "missing" } });
      const res = mockRes() as Response;

      await controller.remove(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("falls back to sendControllerError on unexpected error", async () => {
      mockService.remove.mockRejectedValue(new Error("boom"));
      const req = makeReq({ params: { id: "c1" } });
      const res = mockRes() as Response;

      await controller.remove(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("setProducts", () => {
    it("returns 200 with accepted/skipped on success", async () => {
      mockService.setProducts.mockResolvedValue({
        accepted: ["p1"],
        skipped: ["bad"],
      });
      const productIds = [
        "11111111-1111-1111-1111-111111111111",
        "22222222-2222-2222-2222-222222222222",
      ];
      const req = makeReq({ params: { id: "c1" }, body: { productIds } });
      const res = mockRes() as Response;

      await controller.setProducts(req, res);

      expect(mockService.setProducts).toHaveBeenCalledWith(
        "t1",
        "c1",
        productIds,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          accepted: ["p1"],
          skipped: ["bad"],
        }),
      );
    });

    it("returns 400 on Zod validation error (non-uuid)", async () => {
      const req = makeReq({
        params: { id: "c1" },
        body: { productIds: ["not-a-uuid"] },
      });
      const res = mockRes() as Response;

      await controller.setProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.setProducts).not.toHaveBeenCalled();
    });

    it("returns 404 when collection missing", async () => {
      mockService.setProducts.mockRejectedValue(
        createError("Collection not found", 404),
      );
      const req = makeReq({
        params: { id: "missing" },
        body: { productIds: [] },
      });
      const res = mockRes() as Response;

      await controller.setProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("falls back to sendControllerError on unexpected error", async () => {
      mockService.setProducts.mockRejectedValue(new Error("boom"));
      const req = makeReq({
        params: { id: "c1" },
        body: { productIds: [] },
      });
      const res = mockRes() as Response;

      await controller.setProducts(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });
});
