/**
 * Unit tests for PromoRepository — findById, findByCode.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindFirst } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({
  default: {
    promoCode: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    promoProduct: { createMany: vi.fn(), deleteMany: vi.fn() },
  },
}));

import promoRepository from "./promo.repository";

describe("PromoRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("findById", () => {
    it("queries with tenantId and id", async () => {
      mockFindFirst.mockResolvedValue({ id: "pr1", code: "SAVE10" });

      const result = await promoRepository.findById("t1", "pr1");

      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: "pr1", tenantId: "t1" }),
        }),
      );
      expect(result?.code).toBe("SAVE10");
    });
  });
});
