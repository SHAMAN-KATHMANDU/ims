/**
 * Unit tests for LeadRepository — create, findById.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate, mockFindFirst } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindFirst: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({
  default: {
    lead: {
      create: (...args: unknown[]) => mockCreate(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/utils/pagination", () => ({
  getPaginationParams: vi.fn(),
  createPaginationResult: vi.fn(),
  getPrismaOrderBy: vi.fn().mockReturnValue({ createdAt: "desc" }),
}));

import leadRepository from "./lead.repository";

describe("LeadRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("create", () => {
    it("calls prisma.lead.create with correct data", async () => {
      mockCreate.mockResolvedValue({
        id: "l1",
        name: "John Doe",
        status: "NEW",
      });

      await leadRepository.create({
        tenantId: "t1",
        name: "John Doe",
        email: "john@example.com",
        phone: null,
        companyName: "Acme",
        status: "NEW",
        source: "Web",
        notes: null,
        assignedToId: "u1",
        createdById: "u1",
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: "t1",
          name: "John Doe",
          status: "NEW",
        }),
        include: expect.any(Object),
      });
    });
  });

  describe("findById", () => {
    it("queries with tenantId and id", async () => {
      mockFindFirst.mockResolvedValue({ id: "l1", name: "John" });

      const result = await leadRepository.findById("t1", "l1");

      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "l1", tenantId: "t1" },
        }),
      );
      expect(result?.id).toBe("l1");
    });
  });
});
