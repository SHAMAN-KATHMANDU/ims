/**
 * Unit tests for InventoryRepository — query construction and data access.
 * Mocks Prisma to verify correct calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockFindUnique,
  mockFindFirst,
  mockFindMany,
  mockCount,
  mockUpdate,
  mockCreate,
} = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockFindFirst: vi.fn(),
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
  mockUpdate: vi.fn(),
  mockCreate: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({
  default: {
    location: {
      findUnique: mockFindUnique,
    },
    product: {
      findUnique: mockFindUnique,
    },
    productVariation: {
      findUnique: mockFindUnique,
    },
    productSubVariation: {
      findFirst: mockFindFirst,
    },
    locationInventory: {
      findUnique: mockFindUnique,
      findFirst: mockFindFirst,
      findMany: mockFindMany,
      count: mockCount,
      update: mockUpdate,
      create: mockCreate,
    },
  },
}));

// Import after mock
import inventoryRepository from "./inventory.repository";

describe("InventoryRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findLocationById", () => {
    it("calls prisma.location.findUnique with correct id", async () => {
      mockFindUnique.mockResolvedValue({ id: "loc1", name: "Warehouse A" });

      await inventoryRepository.findLocationById("loc1");

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "loc1" },
      });
    });
  });

  describe("findInventoryByUniqueKey", () => {
    it("calls prisma.locationInventory.findFirst with a plain equality where", async () => {
      // findFirst (not findUnique): Prisma 5.22 throws on a null component in
      // the compound-unique where, so a null sub_variation_id is matched via a
      // plain equality filter instead.
      mockFindFirst.mockResolvedValue({
        id: "inv1",
        quantity: 10,
        locationId: "loc1",
        variationId: "v1",
        subVariationId: null,
      });

      await inventoryRepository.findInventoryByUniqueKey("loc1", "v1", null);

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          locationId: "loc1",
          variationId: "v1",
          subVariationId: null,
        },
      });
    });
  });

  describe("updateInventoryQuantity", () => {
    it("calls prisma.locationInventory.update with quantity", async () => {
      mockUpdate.mockResolvedValue({ id: "inv1", quantity: 15 });

      await inventoryRepository.updateInventoryQuantity("inv1", 15);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "inv1" },
        data: { quantity: 15 },
      });
    });
  });

  describe("createInventory", () => {
    it("calls prisma.locationInventory.create with correct data", async () => {
      mockCreate.mockResolvedValue({
        id: "inv1",
        locationId: "loc1",
        variationId: "v1",
        subVariationId: null,
        quantity: 5,
      });

      await inventoryRepository.createInventory("loc1", "v1", null, 5);

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          locationId: "loc1",
          variationId: "v1",
          subVariationId: null,
          quantity: 5,
        },
      });
    });
  });
});
