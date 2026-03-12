/**
 * Multi-tenant isolation tests.
 * Verifies that repository queries include tenantId in where clauses —
 * ensuring Tenant A cannot access Tenant B's data.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { CategoryRepository } from "@/modules/categories/category.repository";

const mockFindMany = vi.fn();
const mockCount = vi.fn();
const mockFindFirst = vi.fn();

vi.mock("@/config/prisma", () => {
  const mockCategory = {
    findMany: (...args: unknown[]) => mockFindMany(...args),
    count: (...args: unknown[]) => mockCount(...args),
    findFirst: (...args: unknown[]) => mockFindFirst(...args),
  };
  return {
    default: { category: mockCategory },
    basePrisma: { category: mockCategory },
  };
});

describe("Tenant isolation", () => {
  const repo = new CategoryRepository();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);
    mockFindFirst.mockResolvedValue(null);
  });

  it("findAll includes tenantId in where clause", async () => {
    await repo.findAll(
      "tenant-A",
      {
        page: 1,
        limit: 10,
        sortBy: "name",
        sortOrder: "asc",
        search: undefined,
      },
      { status: "active" },
    );

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-A",
          deletedAt: null,
        }),
      }),
    );
  });

  it("findById includes tenantId in where clause", async () => {
    await repo.findById("cat-1", "tenant-B");

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "cat-1",
          tenantId: "tenant-B",
          deletedAt: null,
        }),
      }),
    );
  });
});
