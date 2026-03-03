import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./product.service", () => ({
  default: {
    create: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteVariation: vi.fn(),
    findAllCategories: vi.fn(),
    findAllDiscountTypes: vi.fn(),
    createDiscountType: vi.fn(),
    updateDiscountType: vi.fn(),
    deleteDiscountType: vi.fn(),
    findAllProductDiscounts: vi.fn(),
    getProductDiscounts: vi.fn(),
    getProductsForExport: vi.fn(),
  },
}));

vi.mock("./product.bulk.service", () => ({
  processProductBulkRows: vi.fn(),
  buildProductBulkTemplate: vi.fn(),
}));

vi.mock("@/utils/bulkParse", () => ({
  parseBulkFile: vi.fn(),
}));

vi.mock("fs", () => ({
  unlinkSync: vi.fn(),
}));

vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({ default: {} }));

import productController from "./product.controller";
import * as productBulkService from "./product.bulk.service";
import * as bulkParse from "@/utils/bulkParse";
import * as productServiceModule from "./product.service";
import { sendControllerError } from "@/utils/controllerError";

const mockService = productServiceModule.default as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>;

function mockRes(): Partial<Response> {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    user: { id: "u1", tenantId: "t1", role: "admin", tenantSlug: "acme" },
    params: {},
    body: {},
    query: {},
    file: undefined,
    socket: {},
    get: vi.fn(),
    ...overrides,
  } as unknown as Request;
}

function makeAppError(
  message: string,
  statusCode: number,
  extra?: Record<string, unknown>,
) {
  const err = new Error(message) as Error & Record<string, unknown>;
  err.statusCode = statusCode;
  if (extra) Object.assign(err, extra);
  return err;
}

describe("ProductController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createProduct", () => {
    it("returns 201 with created product on success", async () => {
      const product = { id: "p1", name: "Shoes" };
      mockService.create.mockResolvedValue(product);
      const req = makeReq({
        body: {
          name: "Shoes",
          categoryId: "550e8400-e29b-41d4-a716-446655440000",
          costPrice: 100,
          mrp: 150,
          variations: [{ imsCode: "IMS-001", stockQuantity: 0 }],
        },
      });
      const res = mockRes() as Response;

      await productController.createProduct(req, res);

      expect(mockService.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ product }),
      );
    });

    it("returns 400 on Zod validation error", async () => {
      const req = makeReq({ body: { name: "Shoes" } });
      const res = mockRes() as Response;

      await productController.createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.create).not.toHaveBeenCalled();
    });

    it("returns 409 when IMS code conflict", async () => {
      mockService.create.mockRejectedValue(
        makeAppError("Product with this IMS code already exists", 409),
      );
      const req = makeReq({
        body: {
          name: "Shoes",
          categoryId: "550e8400-e29b-41d4-a716-446655440000",
          costPrice: 100,
          mrp: 150,
          variations: [{ imsCode: "IMS-001", stockQuantity: 0 }],
        },
      });
      const res = mockRes() as Response;

      await productController.createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("returns 404 when category not found", async () => {
      mockService.create.mockRejectedValue(
        makeAppError("Category not found", 404, {
          providedCategoryId: "550e8400-e29b-41d4-a716-446655440000",
        }),
      );
      const req = makeReq({
        body: {
          name: "Shoes",
          categoryId: "550e8400-e29b-41d4-a716-446655440000",
          costPrice: 100,
          mrp: 150,
          variations: [{ imsCode: "IMS-001", stockQuantity: 0 }],
        },
      });
      const res = mockRes() as Response;

      await productController.createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.create.mockRejectedValue(new Error("DB connection failed"));
      const req = makeReq({
        body: {
          name: "Shoes",
          categoryId: "550e8400-e29b-41d4-a716-446655440000",
          costPrice: 100,
          mrp: 150,
          variations: [{ imsCode: "IMS-001", stockQuantity: 0 }],
        },
      });
      const res = mockRes() as Response;

      await productController.createProduct(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("getAllProducts", () => {
    it("returns 200 with products and pagination", async () => {
      const result = { data: [], pagination: {}, locationId: null };
      mockService.findAll.mockResolvedValue(result);
      const req = makeReq({ query: { page: "1", limit: "10" } });
      const res = mockRes() as Response;

      await productController.getAllProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Products fetched successfully" }),
      );
    });

    it("returns 400 on invalid query (e.g. invalid categoryId UUID)", async () => {
      const req = makeReq({
        query: { categoryId: "not-a-uuid", page: "1", limit: "10" },
      });
      const res = mockRes() as Response;

      await productController.getAllProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.findAll).not.toHaveBeenCalled();
    });
  });

  describe("getProductById", () => {
    it("returns 200 with product on success", async () => {
      const product = { id: "p1", name: "Shoes" };
      mockService.findById.mockResolvedValue(product);
      const req = makeReq({ params: { id: "p1" } });
      const res = mockRes() as Response;

      await productController.getProductById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ product }),
      );
    });

    it("returns 404 when product not found", async () => {
      mockService.findById.mockRejectedValue(
        makeAppError("Product not found", 404),
      );
      const req = makeReq({ params: { id: "missing" } });
      const res = mockRes() as Response;

      await productController.getProductById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("updateProduct", () => {
    it("returns 200 with updated product on success", async () => {
      const product = { id: "p1", name: "Updated" };
      mockService.update.mockResolvedValue(product);
      const req = makeReq({
        params: { id: "p1" },
        body: { name: "Updated" },
      });
      const res = mockRes() as Response;

      await productController.updateProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ product }),
      );
    });

    it("returns 400 on Zod validation error", async () => {
      const req = makeReq({ params: { id: "p1" }, body: { name: "" } });
      const res = mockRes() as Response;

      await productController.updateProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.update).not.toHaveBeenCalled();
    });
  });

  describe("deleteProduct", () => {
    it("returns 200 on successful deletion", async () => {
      mockService.delete.mockResolvedValue(undefined);
      const req = makeReq({ params: { id: "p1" } });
      const res = mockRes() as Response;

      await productController.deleteProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 404 when product not found", async () => {
      mockService.delete.mockRejectedValue(
        makeAppError("Product not found", 404),
      );
      const req = makeReq({ params: { id: "missing" } });
      const res = mockRes() as Response;

      await productController.deleteProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("deleteVariation", () => {
    it("returns 200 on successful deletion", async () => {
      mockService.deleteVariation.mockResolvedValue(undefined);
      const req = makeReq({
        params: { productId: "p1", variationId: "v1" },
      });
      const res = mockRes() as Response;

      await productController.deleteVariation(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 404 when variation not found", async () => {
      mockService.deleteVariation.mockRejectedValue(
        makeAppError("Variation not found", 404),
      );
      const req = makeReq({
        params: { productId: "p1", variationId: "v1" },
      });
      const res = mockRes() as Response;

      await productController.deleteVariation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("getAllCategories", () => {
    it("returns 200 with categories", async () => {
      mockService.findAllCategories.mockResolvedValue({
        data: [],
        pagination: {},
      });
      const req = makeReq();
      const res = mockRes() as Response;

      await productController.getAllCategories(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("createDiscountType", () => {
    it("returns 201 with created discount type", async () => {
      const discountType = { id: "dt1", name: "Normal" };
      mockService.createDiscountType.mockResolvedValue(discountType);
      const req = makeReq({ body: { name: "Normal" } });
      const res = mockRes() as Response;

      await productController.createDiscountType(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ discountType }),
      );
    });
  });

  describe("getProductDiscounts", () => {
    it("returns 200 with discounts on success", async () => {
      const discounts = [{ id: "d1", name: "Normal", value: 10 }];
      mockService.getProductDiscounts.mockResolvedValue(discounts);
      const req = makeReq({ params: { id: "p1" } });
      const res = mockRes() as Response;

      await productController.getProductDiscounts(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ discounts }),
      );
    });

    it("returns 400 when product ID is missing", async () => {
      const req = makeReq({ params: {} });
      const res = mockRes() as Response;

      await productController.getProductDiscounts(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.getProductDiscounts).not.toHaveBeenCalled();
    });

    it("returns 404 when product not found", async () => {
      mockService.getProductDiscounts.mockRejectedValue(
        makeAppError("Product not found", 404),
      );
      const req = makeReq({ params: { id: "missing" } });
      const res = mockRes() as Response;

      await productController.getProductDiscounts(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("getAllProductDiscounts", () => {
    it("returns 200 with product discounts list", async () => {
      mockService.findAllProductDiscounts.mockResolvedValue({
        data: [],
        pagination: {},
      });
      const req = makeReq();
      const res = mockRes() as Response;

      await productController.getAllProductDiscounts(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Product discounts fetched successfully",
        }),
      );
    });
  });

  describe("bulkUploadProducts", () => {
    it("returns 400 when no file uploaded", async () => {
      const req = makeReq({ file: undefined });
      const res = mockRes() as Response;

      await productController.bulkUploadProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "No file uploaded",
          errors: [],
        }),
      );
    });

    it("returns 200 with bulk upload result on success", async () => {
      const parseResult = {
        rows: [
          {
            imsCode: "IMS-001",
            location: "Warehouse",
            category: "Cat",
            name: "Prod",
            attributes: "a",
            values: "b",
            costPrice: 10,
            finalSP: 20,
          },
        ],
        errors: [] as Array<{ row: number; message: string }>,
      };
      vi.mocked(bulkParse.parseBulkFile).mockResolvedValue(parseResult);
      vi.mocked(productBulkService.processProductBulkRows).mockResolvedValue({
        created: [
          { id: "p1", imsCode: "IMS-001", name: "Prod", variationsCount: 1 },
        ],
        updated: [],
        skipped: [],
        errors: [],
      });
      const req = makeReq({
        file: {
          path: "/tmp/upload.xlsx",
          originalname: "upload.xlsx",
        } as Express.Multer.File,
      });
      const res = mockRes() as Response;

      await productController.bulkUploadProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Bulk upload completed",
          summary: expect.objectContaining({
            total: 1,
            created: 1,
            updated: 0,
            skipped: 0,
            errors: 0,
          }),
        }),
      );
    });
  });

  describe("downloadBulkUploadTemplate", () => {
    it("returns buffer with correct headers", async () => {
      const buffer = Buffer.from("excel-content");
      vi.mocked(productBulkService.buildProductBulkTemplate).mockResolvedValue(
        buffer,
      );
      const req = makeReq();
      const res = mockRes() as Response;

      await productController.downloadBulkUploadTemplate(req, res);

      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        'attachment; filename="products_bulk_upload_template.xlsx"',
      );
      expect(res.send).toHaveBeenCalledWith(buffer);
    });
  });

  describe("downloadProducts", () => {
    it("returns excel buffer with correct format", async () => {
      const products = [
        {
          id: "p1",
          name: "Prod",
          variations: [{ imsCode: "IMS-001", stockQuantity: 10 }],
          category: { name: "Cat" },
          discounts: [],
        },
      ];
      mockService.getProductsForExport.mockResolvedValue(products);
      const req = makeReq({ query: { format: "excel" } });
      const res = mockRes() as Response;

      await productController.downloadProducts(req, res);

      expect(mockService.getProductsForExport).toHaveBeenCalledWith(undefined);
      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      expect(res.send).toHaveBeenCalled();
    });

    it("returns 400 on invalid format", async () => {
      const req = makeReq({ query: { format: "pdf" } });
      const res = mockRes() as Response;

      await productController.downloadProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.getProductsForExport).not.toHaveBeenCalled();
    });
  });
});
