/**
 * Unit tests for DealRepository — create, findById.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate, mockFindFirst } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindFirst: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({
  default: {
    deal: {
      create: (...args: unknown[]) => mockCreate(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/utils/pagination", () => ({
  getPaginationParams: vi.fn().mockReturnValue({
    page: 1,
    limit: 10,
    sortBy: "createdAt",
    sortOrder: "desc" as const,
    search: undefined,
  }),
  createPaginationResult: vi.fn((data: unknown, total: number) => ({
    data,
    pagination: { totalItems: total, currentPage: 1, totalPages: 1 },
  })),
  getPrismaOrderBy: vi.fn().mockReturnValue({ createdAt: "desc" }),
}));

import dealRepository from "./deal.repository";

describe("DealRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("findById", () => {
    it("queries with tenantId and id", async () => {
      mockFindFirst.mockResolvedValue({ id: "d1", name: "Deal 1" });

      const result = await dealRepository.findById("t1", "d1");

      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: "d1",
            tenantId: "t1",
          }),
        }),
      );
      expect(result?.id).toBe("d1");
    });
  });
});
