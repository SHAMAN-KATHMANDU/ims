import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./sale.service", () => ({
  SaleCalculationError: class SaleCalculationError extends Error {
    status: number;
    extra?: Record<string, unknown>;
    constructor(
      status: number,
      message: string,
      extra?: Record<string, unknown>,
    ) {
      super(message);
      this.status = status;
      this.extra = extra;
    }
  },
  default: {
    createSale: vi.fn(),
    previewSale: vi.fn(),
    getAllSales: vi.fn(),
    getSalesSinceLastLogin: vi.fn(),
    getSaleById: vi.fn(),
    addPayment: vi.fn(),
    getSalesSummary: vi.fn(),
    getSalesByLocation: vi.fn(),
    getDailySales: vi.fn(),
    getSalesForExport: vi.fn(),
  },
}));

vi.mock("./sale.bulk.service", () => ({
  processSaleBulkRows: vi.fn(),
  buildSaleBulkTemplate: vi.fn(),
}));

vi.mock("@/utils/bulkParse", () => ({
  parseBulkFile: vi.fn(),
}));

vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));

vi.mock("@/utils/pagination", () => ({
  getPaginationParams: vi.fn(() => ({
    page: 1,
    limit: 10,
    sortBy: "createdAt",
    sortOrder: "desc",
    search: "",
  })),
  createPaginationResult: vi.fn(
    (data: unknown[], total: number, page: number, limit: number) => ({
      data,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    }),
  ),
}));

import saleController from "./sale.controller";
import saleService from "./sale.service";
import { sendControllerError } from "@/utils/controllerError";
import { CreateSaleSchema } from "./sale.schema";

const mockCreateSale = vi.mocked(saleService.createSale);
const mockPreviewSale = vi.mocked(saleService.previewSale);
const mockGetAllSales = vi.mocked(saleService.getAllSales);
const mockGetSalesSinceLastLogin = vi.mocked(
  saleService.getSalesSinceLastLogin,
);
const mockGetSaleById = vi.mocked(saleService.getSaleById);
const mockAddPayment = vi.mocked(saleService.addPayment);
const mockGetSalesSummary = vi.mocked(saleService.getSalesSummary);
const mockGetSalesByLocation = vi.mocked(saleService.getSalesByLocation);
const mockGetDailySales = vi.mocked(saleService.getDailySales);

function mockRes(): Partial<Response> {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    get: vi.fn(),
  };
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    params: {},
    body: {},
    query: {},
    user: { id: "u1", tenantId: "t1", role: "admin", tenantSlug: "acme" },
    socket: {} as Request["socket"],
    get: vi.fn(() => undefined),
    ...overrides,
  } as unknown as Request;
}

describe("SaleController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createSale", () => {
    it("CreateSaleSchema parses valid body", () => {
      const body = {
        locationId: "550e8400-e29b-41d4-a716-446655440000",
        items: [
          { variationId: "550e8400-e29b-41d4-a716-446655440001", quantity: 1 },
        ],
      };
      const result = CreateSaleSchema.safeParse(body);
      expect(result.success).toBe(true);
    });

    it("returns 201 with sale on success", async () => {
      const sale = {
        id: "s1",
        saleCode: "SL-20250303-ABCD",
        total: 100,
      };
      mockCreateSale.mockResolvedValue(sale);

      const req = makeReq({
        body: {
          locationId: "550e8400-e29b-41d4-a716-446655440000",
          items: [
            {
              variationId: "550e8400-e29b-41d4-a716-446655440001",
              quantity: 1,
            },
          ],
        },
      });
      const res = mockRes() as Response;

      await saleController.createSale(req, res);

      expect(mockCreateSale).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "t1",
          userId: "u1",
        }),
        expect.objectContaining({
          locationId: "550e8400-e29b-41d4-a716-446655440000",
          items: [
            {
              variationId: "550e8400-e29b-41d4-a716-446655440001",
              quantity: 1,
            },
          ],
        }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Sale created successfully",
        sale,
      });
    });

    it("returns 400 on Zod validation error", async () => {
      const req = makeReq({
        body: {
          locationId: "550e8400-e29b-41d4-a716-446655440000",
          items: [],
        },
      });
      const res = mockRes() as Response;

      await saleController.createSale(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockCreateSale).not.toHaveBeenCalled();
    });

    it("returns 404 when location not found", async () => {
      mockCreateSale.mockRejectedValue(
        Object.assign(new Error("Location not found"), { statusCode: 404 }),
      );

      const req = makeReq({
        body: {
          locationId: "550e8400-e29b-41d4-a716-446655440000",
          items: [
            {
              variationId: "550e8400-e29b-41d4-a716-446655440001",
              quantity: 1,
            },
          ],
        },
      });
      const res = mockRes() as Response;

      await saleController.createSale(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockCreateSale.mockRejectedValue(new Error("DB down"));

      const req = makeReq({
        body: {
          locationId: "550e8400-e29b-41d4-a716-446655440000",
          items: [
            {
              variationId: "550e8400-e29b-41d4-a716-446655440001",
              quantity: 1,
            },
          ],
        },
      });
      const res = mockRes() as Response;

      await saleController.createSale(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("previewSale", () => {
    it("returns 200 with subtotal, discount, total", async () => {
      mockPreviewSale.mockResolvedValue({
        subtotal: 100,
        totalDiscount: 10,
        total: 90,
        totalPromoDiscount: 5,
      });

      const req = makeReq({
        body: {
          locationId: "550e8400-e29b-41d4-a716-446655440000",
          items: [
            {
              variationId: "550e8400-e29b-41d4-a716-446655440001",
              quantity: 1,
            },
          ],
        },
      });
      const res = mockRes() as Response;

      await saleController.previewSale(req, res);

      expect(mockPreviewSale).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        subtotal: 100,
        discount: 10,
        total: 90,
        promoDiscount: 5,
      });
    });
  });

  describe("getAllSales", () => {
    it("returns 200 with paginated sales", async () => {
      const sales = [{ id: "s1", saleCode: "SL-001" }];
      mockGetAllSales.mockResolvedValue({
        sales,
        totalItems: 1,
        page: 1,
        limit: 10,
      });

      const req = makeReq();
      const res = mockRes() as Response;

      await saleController.getAllSales(req, res);

      expect(mockGetAllSales).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Sales fetched successfully",
        }),
      );
    });
  });

  describe("getSaleById", () => {
    it("returns 200 with sale on success", async () => {
      const sale = { id: "s1", saleCode: "SL-001" };
      mockGetSaleById.mockResolvedValue(sale);

      const req = makeReq({ params: { id: "s1" } });
      const res = mockRes() as Response;

      await saleController.getSaleById(req, res);

      expect(mockGetSaleById).toHaveBeenCalledWith("s1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Sale fetched successfully",
        sale,
      });
    });

    it("returns 404 when sale not found", async () => {
      mockGetSaleById.mockRejectedValue(
        Object.assign(new Error("Sale not found"), { statusCode: 404 }),
      );

      const req = makeReq({ params: { id: "s1" } });
      const res = mockRes() as Response;

      await saleController.getSaleById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("addPayment", () => {
    it("returns 201 with sale and payment on success", async () => {
      const sale = { id: "s1" };
      const payment = { id: "p1", amount: 500 };
      mockAddPayment.mockResolvedValue({ sale, payment });

      const req = makeReq({
        params: { id: "s1" },
        body: { method: "CASH", amount: 500 },
      });
      const res = mockRes() as Response;

      await saleController.addPayment(req, res);

      expect(mockAddPayment).toHaveBeenCalledWith("s1", {
        method: "CASH",
        amount: 500,
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Payment added successfully",
        sale,
        payment,
      });
    });

    it("returns 400 on Zod validation error", async () => {
      const req = makeReq({
        params: { id: "s1" },
        body: { method: "INVALID", amount: 500 },
      });
      const res = mockRes() as Response;

      await saleController.addPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockAddPayment).not.toHaveBeenCalled();
    });
  });

  describe("getSalesSinceLastLogin", () => {
    it("returns 200 with paginated sales", async () => {
      mockGetSalesSinceLastLogin.mockResolvedValue({
        sales: [{ id: "s1" }],
        totalItems: 1,
        page: 1,
        limit: 10,
      });
      const req = makeReq({ query: { page: "1", limit: "10" } });
      const res = mockRes() as Response;

      await saleController.getSalesSinceLastLogin(req, res);

      expect(mockGetSalesSinceLastLogin).toHaveBeenCalledWith(
        "u1",
        expect.objectContaining({ page: 1, limit: 10 }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getSalesSummary", () => {
    it("returns 200 with summary on success", async () => {
      mockGetSalesSummary.mockResolvedValue({
        totalSales: 10,
        totalRevenue: 5000,
        generalSales: { count: 6, revenue: 3000 },
        memberSales: { count: 4, revenue: 2000 },
      });
      const req = makeReq();
      const res = mockRes() as Response;

      await saleController.getSalesSummary(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Sales summary fetched successfully",
          summary: expect.any(Object),
        }),
      );
    });
  });

  describe("getSalesByLocation", () => {
    it("returns 200 with location data", async () => {
      mockGetSalesByLocation.mockResolvedValue([
        {
          locationId: "loc1",
          locationName: "Store A",
          totalSales: 5,
          totalRevenue: 1000,
        },
      ]);
      const req = makeReq();
      const res = mockRes() as Response;

      await saleController.getSalesByLocation(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Sales by location fetched successfully",
          data: expect.any(Array),
        }),
      );
    });
  });

  describe("getDailySales", () => {
    it("returns 200 with daily data", async () => {
      mockGetDailySales.mockResolvedValue([
        { date: "2025-03-01", total: 100, count: 2, general: 50, member: 50 },
      ]);
      const req = makeReq();
      const res = mockRes() as Response;

      await saleController.getDailySales(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Daily sales fetched successfully",
          data: expect.any(Array),
        }),
      );
    });
  });
});
