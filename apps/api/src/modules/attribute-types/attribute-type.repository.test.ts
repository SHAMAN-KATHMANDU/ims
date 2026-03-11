/**
 * Unit tests for AttributeTypeRepository — findMany.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindMany = vi.fn();

vi.mock("@/config/prisma", () => ({
  default: {
    attributeType: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import attributeTypeRepository from "./attribute-type.repository";

describe("AttributeTypeRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("findMany", () => {
    it("queries with tenantId", async () => {
      mockFindMany.mockResolvedValue([
        { id: "at1", name: "Color", code: "color" },
      ]);

      const result = await attributeTypeRepository.findMany("t1");

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { tenantId: "t1" },
        orderBy: expect.any(Array),
        include: expect.any(Object),
      });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Color");
    });
  });
});
