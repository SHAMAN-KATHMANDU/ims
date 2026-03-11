import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("@/modules/products/product.controller", () => ({
  default: {
    bulkUploadProducts: vi.fn(),
    downloadBulkUploadTemplate: vi.fn(),
    downloadProducts: vi.fn(),
  },
}));
vi.mock("@/modules/members/member.controller", () => ({
  default: {
    bulkUploadMembers: vi.fn(),
    downloadBulkUploadTemplate: vi.fn(),
    downloadMembers: vi.fn(),
  },
}));
vi.mock("@/modules/sales/sale.controller", () => ({
  default: {
    bulkUploadSales: vi.fn(),
    downloadBulkUploadTemplate: vi.fn(),
    downloadSales: vi.fn(),
  },
}));

import bulkController from "./bulk.controller";
import productController from "@/modules/products/product.controller";
import memberController from "@/modules/members/member.controller";
import saleController from "@/modules/sales/sale.controller";

function mockRes(): Partial<Response> {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    user: { id: "u1", tenantId: "t1", role: "admin", tenantSlug: "acme" },
    params: {},
    body: {},
    query: {},
    file: undefined,
    ...overrides,
  } as unknown as Request;
}

describe("BulkController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("bulkUpload", () => {
    it("returns 400 when type is invalid", async () => {
      const req = makeReq({
        params: { type: "invalid" },
        file: {} as Express.Multer.File,
      });
      const res = mockRes() as Response;

      await bulkController.bulkUpload(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Invalid or missing type"),
        }),
      );
    });

    it("returns 400 when no file uploaded", async () => {
      const req = makeReq({ params: { type: "products" } });
      const res = mockRes() as Response;

      await bulkController.bulkUpload(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "No file uploaded" });
    });

    it("delegates to productController.bulkUploadProducts when type=products", async () => {
      const req = makeReq({
        params: { type: "products" },
        file: {} as Express.Multer.File,
      });
      const res = mockRes() as Response;
      vi.mocked(productController.bulkUploadProducts).mockResolvedValue();

      await bulkController.bulkUpload(req, res);

      expect(productController.bulkUploadProducts).toHaveBeenCalledWith(
        req,
        res,
      );
    });

    it("delegates to memberController.bulkUploadMembers when type=members", async () => {
      const req = makeReq({
        params: { type: "members" },
        file: {} as Express.Multer.File,
      });
      const res = mockRes() as Response;
      vi.mocked(memberController.bulkUploadMembers).mockResolvedValue();

      await bulkController.bulkUpload(req, res);

      expect(memberController.bulkUploadMembers).toHaveBeenCalledWith(req, res);
    });

    it("delegates to saleController.bulkUploadSales when type=sales", async () => {
      const req = makeReq({
        params: { type: "sales" },
        file: {} as Express.Multer.File,
      });
      const res = mockRes() as Response;
      vi.mocked(saleController.bulkUploadSales).mockResolvedValue();

      await bulkController.bulkUpload(req, res);

      expect(saleController.bulkUploadSales).toHaveBeenCalledWith(req, res);
    });
  });

  describe("downloadTemplate", () => {
    it("returns 400 when type is invalid", async () => {
      const req = makeReq({ query: { type: "invalid" } });
      const res = mockRes() as Response;

      await bulkController.downloadTemplate(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("delegates to productController.downloadBulkUploadTemplate when type=products", async () => {
      const req = makeReq({ query: { type: "products" } });
      const res = mockRes() as Response;
      vi.mocked(
        productController.downloadBulkUploadTemplate,
      ).mockResolvedValue();

      await bulkController.downloadTemplate(req, res);

      expect(productController.downloadBulkUploadTemplate).toHaveBeenCalledWith(
        req,
        res,
      );
    });
  });

  describe("download", () => {
    it("returns 400 when type is invalid", async () => {
      const req = makeReq({ query: { type: "invalid" } });
      const res = mockRes() as Response;

      await bulkController.download(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("delegates to productController.downloadProducts when type=products", async () => {
      const req = makeReq({ query: { type: "products" } });
      const res = mockRes() as Response;
      vi.mocked(productController.downloadProducts).mockResolvedValue();

      await bulkController.download(req, res);

      expect(productController.downloadProducts).toHaveBeenCalledWith(req, res);
    });
  });
});
