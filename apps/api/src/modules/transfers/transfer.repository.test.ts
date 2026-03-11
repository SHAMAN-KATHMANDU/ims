/**
 * Unit tests for TransferRepository — query construction and data access.
 * Mocks Prisma to verify correct calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockFindUnique,
  mockFindFirst,
  mockCreate,
  mockFindMany,
  mockTransferCount,
} = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockFindFirst: vi.fn(),
  mockCreate: vi.fn(),
  mockFindMany: vi.fn(),
  mockTransferCount: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({
  default: {
    location: { findUnique: mockFindUnique },
    productVariation: { findUnique: mockFindUnique },
    locationInventory: {
      findFirst: mockFindFirst,
      update: vi.fn(),
      create: vi.fn(),
    },
    transfer: {
      create: mockCreate,
      findUnique: mockFindUnique,
      findMany: mockFindMany,
      count: mockTransferCount,
      update: vi.fn(),
    },
    transferLog: { create: vi.fn() },
  },
}));

import { TransferRepository } from "./transfer.repository";

const transferRepo = new TransferRepository();

describe("TransferRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findLocationById", () => {
    it("calls prisma.location.findUnique with correct id", async () => {
      mockFindUnique.mockResolvedValue({
        id: "loc1",
        name: "Warehouse A",
        isActive: true,
      });

      await transferRepo.findLocationById("loc1");

      expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: "loc1" } });
    });
  });

  describe("findInventory", () => {
    it("calls prisma.locationInventory.findFirst with correct keys", async () => {
      mockFindFirst.mockResolvedValue({
        id: "inv1",
        quantity: 10,
        locationId: "loc1",
        variationId: "v1",
        subVariationId: null,
      });

      await transferRepo.findInventory("loc1", "v1", null);

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          locationId: "loc1",
          variationId: "v1",
          subVariationId: null,
        },
      });
    });
  });

  describe("createTransfer", () => {
    it("calls prisma.transfer.create with correct structure", async () => {
      const data = {
        tenantId: "t1",
        fromLocationId: "loc1",
        toLocationId: "loc2",
        createdById: "u1",
        notes: null,
        items: [{ variationId: "v1", subVariationId: null, quantity: 5 }],
      };

      mockCreate.mockResolvedValue({
        id: "trf1",
        transferCode: "TRF-ABC",
        status: "PENDING",
        ...data,
      });

      await transferRepo.createTransfer(data);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: "t1",
            fromLocationId: "loc1",
            toLocationId: "loc2",
            status: "PENDING",
            createdById: "u1",
            items: {
              create: [
                { variationId: "v1", subVariationId: null, quantity: 5 },
              ],
            },
          }),
        }),
      );
    });
  });

  describe("countTransfers", () => {
    it("calls prisma.transfer.count with where clause", async () => {
      mockTransferCount.mockResolvedValue(5);

      const result = await transferRepo.countTransfers({ tenantId: "t1" });

      expect(mockTransferCount).toHaveBeenCalledWith({
        where: { tenantId: "t1" },
      });
      expect(result).toBe(5);
    });
  });
});
