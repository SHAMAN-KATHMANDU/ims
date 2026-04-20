import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./public-site.service", () => ({
  default: {
    getSite: vi.fn(),
    listProducts: vi.fn(),
    getProduct: vi.fn(),
    listCategories: vi.fn(),
    listFrequentlyBoughtWith: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import controller from "./public-site.controller";
import * as serviceModule from "./public-site.service";
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
    tenant: { id: "t1", name: "Acme", slug: "acme", isActive: true },
    params: {},
    body: {},
    query: {},
    ...overrides,
  } as unknown as Request;
}

describe("PublicSiteController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSite", () => {
    it("returns 200 with site payload", async () => {
      mockService.getSite.mockResolvedValue({
        branding: { theme: "light" },
        contact: null,
        features: null,
        seo: null,
        template: { slug: "minimal" },
      });
      const req = makeReq();
      const res = mockRes() as Response;

      await controller.getSite(req, res);
      expect(mockService.getSite).toHaveBeenCalledWith("t1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          site: expect.objectContaining({ branding: { theme: "light" } }),
        }),
      );
    });

    it("returns 404 when service throws 404", async () => {
      mockService.getSite.mockRejectedValue(
        Object.assign(new Error("Site not found"), { statusCode: 404 }),
      );
      const req = makeReq();
      const res = mockRes() as Response;

      await controller.getSite(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 when req.tenant is missing", async () => {
      const req = makeReq({ tenant: undefined });
      const res = mockRes() as Response;

      await controller.getSite(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.getSite).not.toHaveBeenCalled();
    });

    it("falls back to sendControllerError on unexpected failure", async () => {
      mockService.getSite.mockRejectedValue(new Error("DB down"));
      const req = makeReq();
      const res = mockRes() as Response;

      await controller.getSite(req, res);
      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("listProducts", () => {
    it("returns 200 with products + pagination", async () => {
      mockService.listProducts.mockResolvedValue({
        products: [{ id: "p1" }],
        total: 1,
        page: 1,
        limit: 24,
      });
      const req = makeReq();
      const res = mockRes() as Response;

      await controller.listProducts(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          products: [{ id: "p1" }],
          total: 1,
        }),
      );
    });

    it("coerces page/limit query strings through the schema", async () => {
      mockService.listProducts.mockResolvedValue({
        products: [],
        total: 0,
        page: 3,
        limit: 48,
      });
      const req = makeReq({ query: { page: "3", limit: "48" } });
      const res = mockRes() as Response;

      await controller.listProducts(req, res);
      expect(mockService.listProducts).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({ page: 3, limit: 48 }),
      );
    });

    it("returns 400 on invalid query (limit > 100)", async () => {
      const req = makeReq({ query: { limit: "500" } });
      const res = mockRes() as Response;

      await controller.listProducts(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.listProducts).not.toHaveBeenCalled();
    });

    it("returns 404 when site not published", async () => {
      mockService.listProducts.mockRejectedValue(
        Object.assign(new Error("Site not found"), { statusCode: 404 }),
      );
      const req = makeReq();
      const res = mockRes() as Response;

      await controller.listProducts(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("getProduct", () => {
    it("returns 200 with product", async () => {
      mockService.getProduct.mockResolvedValue({ id: "p1", name: "Chair" });
      const req = makeReq({ params: { id: "p1" } });
      const res = mockRes() as Response;

      await controller.getProduct(req, res);
      expect(mockService.getProduct).toHaveBeenCalledWith("t1", "p1");
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 404 when product missing", async () => {
      mockService.getProduct.mockRejectedValue(
        Object.assign(new Error("Product not found"), { statusCode: 404 }),
      );
      const req = makeReq({ params: { id: "missing" } });
      const res = mockRes() as Response;

      await controller.getProduct(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("listCategories", () => {
    it("returns 200 with categories", async () => {
      mockService.listCategories.mockResolvedValue([{ id: "c1" }]);
      const req = makeReq();
      const res = mockRes() as Response;

      await controller.listCategories(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ categories: [{ id: "c1" }] }),
      );
    });
  });

  describe("listProducts best-selling sort", () => {
    it('forwards sort="best-selling" through the schema to the service', async () => {
      mockService.listProducts.mockResolvedValue({
        products: [],
        total: 0,
        page: 1,
        limit: 24,
      });
      const req = makeReq({ query: { sort: "best-selling" } });
      const res = mockRes() as Response;

      await controller.listProducts(req, res);
      expect(mockService.listProducts).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({ sort: "best-selling" }),
      );
    });
  });

  describe("listFrequentlyBoughtWith", () => {
    it("returns 200 with products", async () => {
      mockService.listFrequentlyBoughtWith.mockResolvedValue({
        products: [{ id: "p2" }, { id: "p3" }],
      });
      const req = makeReq({ params: { id: "p1" } });
      const res = mockRes() as Response;

      await controller.listFrequentlyBoughtWith(req, res);
      expect(mockService.listFrequentlyBoughtWith).toHaveBeenCalledWith(
        "t1",
        "p1",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          products: [{ id: "p2" }, { id: "p3" }],
        }),
      );
    });

    it("returns 404 when service throws 404", async () => {
      mockService.listFrequentlyBoughtWith.mockRejectedValue(
        Object.assign(new Error("Product not found"), { statusCode: 404 }),
      );
      const req = makeReq({ params: { id: "missing" } });
      const res = mockRes() as Response;

      await controller.listFrequentlyBoughtWith(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(sendControllerError).not.toHaveBeenCalled();
    });

    it("returns 400 when req.tenant is missing", async () => {
      const req = makeReq({ tenant: undefined, params: { id: "p1" } });
      const res = mockRes() as Response;

      await controller.listFrequentlyBoughtWith(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.listFrequentlyBoughtWith).not.toHaveBeenCalled();
    });

    it("falls back to sendControllerError on unexpected failure", async () => {
      mockService.listFrequentlyBoughtWith.mockRejectedValue(
        new Error("DB down"),
      );
      const req = makeReq({ params: { id: "p1" } });
      const res = mockRes() as Response;

      await controller.listFrequentlyBoughtWith(req, res);
      expect(sendControllerError).toHaveBeenCalled();
    });
  });
});
