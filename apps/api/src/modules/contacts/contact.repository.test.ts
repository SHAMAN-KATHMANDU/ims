import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockCreate,
  mockFindFirst,
  mockFindMany,
  mockCount,
  mockFindUnique,
  mockUpdate,
  mockUpdateMany,
} = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindFirst: vi.fn(),
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockUpdateMany: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({
  default: {
    contact: {
      create: mockCreate,
      findFirst: mockFindFirst,
      findMany: mockFindMany,
      count: mockCount,
      findUnique: mockFindUnique,
      update: mockUpdate,
      updateMany: mockUpdateMany,
    },
  },
}));

import { ContactRepository } from "./contact.repository";

describe("ContactRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateMany.mockResolvedValue({ count: 1 });
  });

  describe("findOrCreateFromMember", () => {
    it("backfills Sales source when reusing an existing contact", async () => {
      mockFindFirst.mockResolvedValue({ id: "c1" });

      const repo = new ContactRepository();
      const result = await repo.findOrCreateFromMember(
        "t1",
        { id: "m1", phone: "+9779812345678", name: "Alice" },
        "u1",
      );

      expect(result).toEqual({ id: "c1" });
      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: {
          id: "c1",
          OR: [{ source: null }, { source: "" }],
        },
        data: { source: "Sales" },
      });
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe("findOrCreateFromSaleInfo", () => {
    it("creates a sales-sourced contact when phone is new", async () => {
      mockFindFirst.mockResolvedValue(null);
      mockCreate.mockResolvedValue({ id: "c2" });

      const repo = new ContactRepository();
      const result = await repo.findOrCreateFromSaleInfo(
        "t1",
        { phone: "+9779812345678", name: "Bob Example" },
        "u1",
      );

      expect(result).toEqual({ id: "c2" });
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          tenantId: "t1",
          firstName: "Bob",
          lastName: "Example",
          phone: "+9779812345678",
          source: "Sales",
          ownedById: "u1",
          createdById: "u1",
        },
        select: { id: true },
      });
    });
  });
});
