import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./inventory.service", () => ({
  default: {
    getLocationInventory: vi.fn(),
    getProductStock: vi.fn(),
    adjustInventory: vi.fn(),
    setInventory: vi.fn(),
    getInventorySummary: vi.fn(),
  },
}));

vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));

import inventoryController from "./inventory.controller";
import inventoryService from "./inventory.service";

const mockService = inventoryService as unknown as Record<
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

describe("InventoryController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getLocationInventory", () => {
    it("returns 200 with data on success", async () => {
      const data = {
        location: { id: "loc1", name: "Store", type: "SHOWROOM" },
        data: [],
        pagination: {},
      };
      mockService.getLocationInventory.mockResolvedValue(data);
      const req = makeReq({ params: { locationId: "loc1" }, query: {} });
      const res = mockRes() as Response;

      await inventoryController.getLocationInventory(req, res);

      expect(mockService.getLocationInventory).toHaveBeenCalledWith(
        "loc1",
        expect.any(Object),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("adjustInventory", () => {
    it("returns 400 when body invalid", async () => {
      const req = makeReq({
        body: { locationId: "loc1" }, // missing variationId, quantity
      });
      const res = mockRes() as Response;

      await inventoryController.adjustInventory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.adjustInventory).not.toHaveBeenCalled();
    });

    it("returns 200 with adjustment on success", async () => {
      const adjustment = { newQuantity: 10 };
      mockService.adjustInventory.mockResolvedValue(adjustment);
      const req = makeReq({
        body: {
          locationId: "loc1",
          variationId: "var1",
          quantity: 5,
        },
      });
      const res = mockRes() as Response;

      await inventoryController.adjustInventory(req, res);

      expect(mockService.adjustInventory).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Inventory adjusted successfully",
          adjustment,
        }),
      );
    });
  });

  describe("getInventorySummary", () => {
    it("returns 200 with summary on success", async () => {
      const result = {
        summary: { totalLocations: 2, totalItems: 10, totalQuantity: 100 },
        locationStats: [],
      };
      mockService.getInventorySummary.mockResolvedValue(result);
      const req = makeReq();
      const res = mockRes() as Response;

      await inventoryController.getInventorySummary(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Inventory summary fetched successfully",
          ...result,
        }),
      );
    });
  });
});
