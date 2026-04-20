import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./bundle.service", () => ({
  BundleService: vi.fn(),
  default: {
    create: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findAllPublic: vi.fn(),
    findPublicBySlug: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import bundleController from "./bundle.controller";
import * as serviceModule from "./bundle.service";
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

const validCreateBody = {
  name: "Starter Pack",
  slug: "starter-pack",
  pricingStrategy: "SUM",
  productIds: ["11111111-1111-1111-1111-111111111111"],
};

describe("BundleController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createBundle", () => {
    it("returns 201 with created bundle on success", async () => {
      const bundle = { id: "b1", slug: "starter-pack" };
      mockService.create.mockResolvedValue(bundle);
      const req = makeReq({ body: validCreateBody });
      const res = mockRes() as Response;

      await bundleController.createBundle(req, res);

      expect(mockService.create).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({
          name: "Starter Pack",
          slug: "starter-pack",
          pricingStrategy: "SUM",
        }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ bundle }),
      );
    });

    it("returns 400 on Zod validation error", async () => {
      const req = makeReq({ body: { title: "", slug: "Bad Slug" } });
      const res = mockRes() as Response;

      await bundleController.createBundle(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.create).not.toHaveBeenCalled();
    });

    it("returns 409 when service throws AppError(409)", async () => {
      mockService.create.mockRejectedValue(createError("slug exists", 409));
      const req = makeReq({ body: validCreateBody });
      const res = mockRes() as Response;

      await bundleController.createBundle(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(sendControllerError).not.toHaveBeenCalled();
    });

    it("falls back to sendControllerError on unexpected error", async () => {
      mockService.create.mockRejectedValue(new Error("DB down"));
      const req = makeReq({ body: validCreateBody });
      const res = mockRes() as Response;

      await bundleController.createBundle(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("getAllBundles", () => {
    it("returns 200 with bundles", async () => {
      mockService.findAll.mockResolvedValue({
        bundles: [{ id: "b1" }],
        total: 1,
      });
      const req = makeReq({ query: { limit: "10" } });
      const res = mockRes() as Response;

      await bundleController.getAllBundles(req, res);

      expect(mockService.findAll).toHaveBeenCalledWith("t1", { limit: "10" });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          bundles: [{ id: "b1" }],
          total: 1,
        }),
      );
    });

    it("falls back to sendControllerError on unexpected error", async () => {
      mockService.findAll.mockRejectedValue(new Error("boom"));
      const req = makeReq();
      const res = mockRes() as Response;

      await bundleController.getAllBundles(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("getBundleById", () => {
    it("returns 200 with bundle on success", async () => {
      mockService.findById.mockResolvedValue({ id: "b1" });
      const req = makeReq({ params: { id: "b1" } });
      const res = mockRes() as Response;

      await bundleController.getBundleById(req, res);

      expect(mockService.findById).toHaveBeenCalledWith("t1", "b1");
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 404 when service returns null", async () => {
      mockService.findById.mockResolvedValue(null);
      const req = makeReq({ params: { id: "missing" } });
      const res = mockRes() as Response;

      await bundleController.getBundleById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("handles array-valued id param by taking the first element", async () => {
      mockService.findById.mockResolvedValue({ id: "b1" });
      const req = makeReq({
        params: { id: ["b1", "extra"] as unknown as string },
      });
      const res = mockRes() as Response;

      await bundleController.getBundleById(req, res);

      expect(mockService.findById).toHaveBeenCalledWith("t1", "b1");
    });
  });

  describe("updateBundle", () => {
    it("returns 200 with updated bundle", async () => {
      mockService.update.mockResolvedValue({ id: "b1", name: "Renamed" });
      const req = makeReq({
        params: { id: "b1" },
        body: { name: "Renamed" },
      });
      const res = mockRes() as Response;

      await bundleController.updateBundle(req, res);

      expect(mockService.update).toHaveBeenCalledWith(
        "t1",
        "b1",
        expect.objectContaining({ name: "Renamed" }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 404 when service returns null", async () => {
      mockService.update.mockResolvedValue(null);
      const req = makeReq({
        params: { id: "missing" },
        body: { name: "New" },
      });
      const res = mockRes() as Response;

      await bundleController.updateBundle(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 on Zod validation error", async () => {
      const req = makeReq({
        params: { id: "b1" },
        body: { slug: "Bad Slug!" },
      });
      const res = mockRes() as Response;

      await bundleController.updateBundle(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.update).not.toHaveBeenCalled();
    });

    it("returns 409 when service throws AppError(409)", async () => {
      mockService.update.mockRejectedValue(createError("slug conflict", 409));
      const req = makeReq({
        params: { id: "b1" },
        body: { slug: "hot" },
      });
      const res = mockRes() as Response;

      await bundleController.updateBundle(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(sendControllerError).not.toHaveBeenCalled();
    });
  });

  describe("deleteBundle", () => {
    it("returns 200 on successful delete", async () => {
      mockService.delete.mockResolvedValue(true);
      const req = makeReq({ params: { id: "b1" } });
      const res = mockRes() as Response;

      await bundleController.deleteBundle(req, res);

      expect(mockService.delete).toHaveBeenCalledWith("t1", "b1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Bundle deleted" }),
      );
    });

    it("returns 404 when service returns falsy", async () => {
      mockService.delete.mockResolvedValue(null);
      const req = makeReq({ params: { id: "missing" } });
      const res = mockRes() as Response;

      await bundleController.deleteBundle(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("falls back to sendControllerError on unexpected error", async () => {
      mockService.delete.mockRejectedValue(new Error("boom"));
      const req = makeReq({ params: { id: "b1" } });
      const res = mockRes() as Response;

      await bundleController.deleteBundle(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("listPublicBundles", () => {
    it("returns 200 with public bundles", async () => {
      mockService.findAllPublic.mockResolvedValue({
        bundles: [{ id: "b1" }],
        total: 1,
      });
      const req = makeReq();
      const res = mockRes() as Response;

      await bundleController.listPublicBundles(req, res);

      expect(mockService.findAllPublic).toHaveBeenCalledWith("t1", {});
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("falls back to sendControllerError on unexpected error", async () => {
      mockService.findAllPublic.mockRejectedValue(new Error("boom"));
      const req = makeReq();
      const res = mockRes() as Response;

      await bundleController.listPublicBundles(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("getPublicBundleBySlug", () => {
    it("returns 200 with bundle + products on success", async () => {
      mockService.findPublicBySlug.mockResolvedValue({
        bundle: { id: "b1", slug: "starter-pack" },
        products: [{ id: "p1" }],
      });
      const req = makeReq({ params: { slug: "starter-pack" } });
      const res = mockRes() as Response;

      await bundleController.getPublicBundleBySlug(req, res);

      expect(mockService.findPublicBySlug).toHaveBeenCalledWith(
        "t1",
        "starter-pack",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          bundle: { id: "b1", slug: "starter-pack" },
          products: [{ id: "p1" }],
        }),
      );
    });

    it("returns 404 when service returns null", async () => {
      mockService.findPublicBySlug.mockResolvedValue(null);
      const req = makeReq({ params: { slug: "missing" } });
      const res = mockRes() as Response;

      await bundleController.getPublicBundleBySlug(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("falls back to sendControllerError on unexpected error", async () => {
      mockService.findPublicBySlug.mockRejectedValue(new Error("boom"));
      const req = makeReq({ params: { slug: "x" } });
      const res = mockRes() as Response;

      await bundleController.getPublicBundleBySlug(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });
});
