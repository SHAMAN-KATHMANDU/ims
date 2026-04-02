import { describe, it, expect, vi, beforeEach } from "vitest";
import { createError } from "@/middlewares/errorHandler";

const mockPublishDomainEvent = vi.fn();
const mockSyncLowStockSignal = vi.fn();
const mockFindLocationById = vi.fn();
const mockGetLocationInventory = vi.fn();
const mockFindProductById = vi.fn();
const mockGetProductStock = vi.fn();
const mockFindVariationById = vi.fn();
const mockFindSubVariation = vi.fn();
const mockFindInventoryByUniqueKey = vi.fn();
const mockUpdateInventoryQuantity = vi.fn();
const mockCreateInventory = vi.fn();
const mockUpsertInventory = vi.fn();
const mockGetInventorySummary = vi.fn();

vi.mock("./inventory.repository", () => ({
  default: {
    findLocationById: (...args: unknown[]) => mockFindLocationById(...args),
    getLocationInventory: (...args: unknown[]) =>
      mockGetLocationInventory(...args),
    findProductById: (...args: unknown[]) => mockFindProductById(...args),
    getProductStock: (...args: unknown[]) => mockGetProductStock(...args),
    findVariationById: (...args: unknown[]) => mockFindVariationById(...args),
    findSubVariation: (...args: unknown[]) => mockFindSubVariation(...args),
    findInventoryByUniqueKey: (...args: unknown[]) =>
      mockFindInventoryByUniqueKey(...args),
    updateInventoryQuantity: (...args: unknown[]) =>
      mockUpdateInventoryQuantity(...args),
    createInventory: (...args: unknown[]) => mockCreateInventory(...args),
    upsertInventory: (...args: unknown[]) => mockUpsertInventory(...args),
    getInventorySummary: (...args: unknown[]) =>
      mockGetInventorySummary(...args),
  },
}));

vi.mock("@/config/tenantContext", () => ({
  getTenantId: () => "t1",
}));
vi.mock("@/config/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));
vi.mock("@/modules/automation/automation.service", () => ({
  default: {
    publishDomainEvent: (...args: unknown[]) => mockPublishDomainEvent(...args),
    syncLowStockSignal: (...args: unknown[]) => mockSyncLowStockSignal(...args),
  },
}));

import { InventoryService } from "./inventory.service";

const inventoryService = new InventoryService();

describe("InventoryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSyncLowStockSignal.mockResolvedValue(undefined);
    mockPublishDomainEvent.mockResolvedValue(undefined);
  });

  describe("getLocationInventory", () => {
    it("throws 404 when location not found", async () => {
      mockFindLocationById.mockResolvedValue(null);

      await expect(
        inventoryService.getLocationInventory("missing", {
          page: 1,
          limit: 10,
        }),
      ).rejects.toMatchObject(createError("Location not found", 404));

      expect(mockGetLocationInventory).not.toHaveBeenCalled();
    });

    it("returns inventory when location exists", async () => {
      mockFindLocationById.mockResolvedValue({
        id: "loc1",
        name: "Warehouse A",
        type: "WAREHOUSE",
      });
      mockGetLocationInventory.mockResolvedValue({
        totalItems: 0,
        inventory: [],
      });

      const result = await inventoryService.getLocationInventory("loc1", {
        page: 1,
        limit: 10,
      });

      expect(result.location.name).toBe("Warehouse A");
      expect(mockGetLocationInventory).toHaveBeenCalled();
    });
  });

  describe("getProductStock", () => {
    it("throws 404 when product not found", async () => {
      mockFindProductById.mockResolvedValue(null);

      await expect(
        inventoryService.getProductStock("missing"),
      ).rejects.toMatchObject(createError("Product not found", 404));
    });
  });

  describe("adjustInventory", () => {
    it("throws 404 when location not found", async () => {
      mockFindLocationById.mockResolvedValue(null);

      await expect(
        inventoryService.adjustInventory({
          locationId: "missing",
          variationId: "v1",
          quantity: 1,
        }),
      ).rejects.toMatchObject(createError("Location not found", 404));
    });

    it("throws 404 when variation not found", async () => {
      mockFindLocationById.mockResolvedValue({ id: "loc1", name: "L1" });
      mockFindVariationById.mockResolvedValue(null);

      await expect(
        inventoryService.adjustInventory({
          locationId: "loc1",
          variationId: "missing",
          quantity: 1,
        }),
      ).rejects.toMatchObject(createError("Product variation not found", 404));
    });

    it("publishes an automation event after inventory adjustment", async () => {
      mockFindLocationById.mockResolvedValue({
        id: "loc1",
        name: "Warehouse A",
        tenantId: "t1",
      });
      mockFindVariationById.mockResolvedValue({
        id: "var1",
        product: { id: "p1", imsCode: "P-1", name: "Widget" },
      });
      mockFindInventoryByUniqueKey.mockResolvedValue({
        id: "inv1",
        quantity: 3,
      });
      mockUpdateInventoryQuantity.mockResolvedValue({
        id: "inv1",
        quantity: 5,
        subVariationId: null,
      });

      const result = await inventoryService.adjustInventory({
        locationId: "loc1",
        variationId: "var1",
        quantity: 2,
      });

      expect(result.newQuantity).toBe(5);
      expect(mockPublishDomainEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "t1",
          eventName: "inventory.stock.adjusted",
          entityId: "inv1",
        }),
      );
    });
  });
});
