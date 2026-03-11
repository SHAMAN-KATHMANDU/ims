/**
 * Unit tests for CompanyRepository — create, findById.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate, mockFindFirst } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindFirst: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({
  default: {
    company: {
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
    sortBy: "name",
    sortOrder: "asc" as const,
    search: undefined,
  }),
  createPaginationResult: vi.fn((data: unknown, total: number) => ({
    data,
    pagination: { totalItems: total, currentPage: 1, totalPages: 1 },
  })),
  getPrismaOrderBy: vi.fn().mockReturnValue({ name: "asc" }),
}));

import companyRepository from "./company.repository";

describe("CompanyRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("create", () => {
    it("calls prisma.company.create with correct data", async () => {
      mockCreate.mockResolvedValue({
        id: "c1",
        name: "Acme",
        tenantId: "t1",
      });

      await companyRepository.create("t1", {
        name: "Acme",
        website: "https://acme.com",
        address: null,
        phone: null,
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          tenantId: "t1",
          name: "Acme",
          website: "https://acme.com",
          address: null,
          phone: null,
        },
      });
    });
  });
});
