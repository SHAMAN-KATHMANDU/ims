/**
 * Unit tests for VendorRepository — findByName, create.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindFirst, mockCreate } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockCreate: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({
  default: {
    vendor: {
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

import vendorRepository from "./vendor.repository";

describe("VendorRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("findByName", () => {
    it("queries with tenantId and name", async () => {
      mockFindFirst.mockResolvedValue({ id: "v1", name: "Acme Supplies" });

      const result = await vendorRepository.findByName("t1", "Acme Supplies");

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { tenantId: "t1", name: "Acme Supplies" },
      });
      expect(result?.name).toBe("Acme Supplies");
    });
  });

  describe("create", () => {
    it("calls prisma.vendor.create with trimmed name", async () => {
      mockCreate.mockResolvedValue({
        id: "v1",
        name: "Acme Supplies",
        tenantId: "t1",
      });

      await vendorRepository.create("t1", {
        name: "  Acme Supplies  ",
        contact: null,
        phone: "+1234567890",
        address: null,
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          tenantId: "t1",
          name: "Acme Supplies",
          contact: null,
          phone: "+1234567890",
          address: null,
        },
      });
    });
  });
});
