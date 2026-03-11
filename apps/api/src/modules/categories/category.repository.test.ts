/**
 * Unit tests for CategoryRepository — findByName, create.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindFirst, mockCreate } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockCreate: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({
  default: {
    category: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      findMany: vi.fn(),
      create: (...args: unknown[]) => mockCreate(...args),
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

import categoryRepository from "./category.repository";

describe("CategoryRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findByName", () => {
    it("queries with tenantId and name", async () => {
      mockFindFirst.mockResolvedValue({ id: "c1", name: "Electronics" });

      const result = await categoryRepository.findByName("t1", "Electronics");

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { tenantId: "t1", name: "Electronics" },
      });
      expect(result?.name).toBe("Electronics");
    });

    it("returns null when not found", async () => {
      mockFindFirst.mockResolvedValue(null);

      const result = await categoryRepository.findByName("t1", "Missing");

      expect(result).toBeNull();
    });
  });

  describe("findByNameExcluding", () => {
    it("queries with excludeId", async () => {
      mockFindFirst.mockResolvedValue(null);

      await categoryRepository.findByNameExcluding("t1", "Electronics", "c1");

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { tenantId: "t1", name: "Electronics", id: { not: "c1" } },
      });
    });
  });

  describe("create", () => {
    it("calls prisma.category.create with correct data", async () => {
      mockCreate.mockResolvedValue({
        id: "c1",
        name: "Electronics",
        tenantId: "t1",
      });

      await categoryRepository.create("t1", {
        name: "Electronics",
        description: "Gadgets",
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          tenantId: "t1",
          name: "Electronics",
          description: "Gadgets",
        },
      });
    });
  });
});
