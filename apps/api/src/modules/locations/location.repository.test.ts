/**
 * Unit tests for LocationRepository — findByName, create.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindFirst, mockCreate } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockCreate: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({
  default: {
    location: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/utils/pagination", () => ({
  getPaginationParams: vi.fn(),
  createPaginationResult: vi.fn(),
  getPrismaOrderBy: vi.fn().mockReturnValue({ name: "asc" }),
}));

import locationRepository from "./location.repository";

describe("LocationRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("findByName", () => {
    it("queries with tenantId and name", async () => {
      mockFindFirst.mockResolvedValue({ id: "loc1", name: "Warehouse" });

      const result = await locationRepository.findByName("t1", "Warehouse");

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { tenantId: "t1", name: "Warehouse" },
      });
      expect(result?.name).toBe("Warehouse");
    });
  });

  describe("create", () => {
    it("calls prisma.location.create with correct data", async () => {
      mockCreate.mockResolvedValue({
        id: "loc1",
        name: "Warehouse",
        type: "WAREHOUSE",
        tenantId: "t1",
      });

      await locationRepository.create("t1", {
        name: "Warehouse",
        type: "WAREHOUSE",
        address: null,
        isDefaultWarehouse: false,
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          tenantId: "t1",
          name: "Warehouse",
          type: "WAREHOUSE",
          address: null,
          isDefaultWarehouse: false,
        },
        include: expect.any(Object),
      });
    });
  });
});
