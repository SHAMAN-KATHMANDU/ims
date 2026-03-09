/**
 * Security tests: IDOR (Insecure Direct Object Reference) prevention.
 * Verifies that resource access always uses tenantId from the authenticated user,
 * not from the request path/body — so User A cannot access User B's resources by ID manipulation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { CategoryRepository } from "@/modules/categories/category.repository";

const mockFindFirst = vi.fn();
const mockFindMany = vi.fn();
const mockCount = vi.fn();

vi.mock("@/config/prisma", () => ({
  default: {
    category: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
  },
}));

describe("IDOR prevention", () => {
  const repo = new CategoryRepository();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFindFirst.mockResolvedValue(null);
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);
  });

  it("findById uses tenantId from auth context — not from path", async () => {
    // Attacker might send GET /categories/victim-tenant-category-id
    // Repository MUST filter by tenantId from JWT, not trust the ID
    const tenantIdFromToken = "tenant-attacker";
    const categoryIdFromPath = "cat-victim-123";

    await repo.findById(categoryIdFromPath, tenantIdFromToken);

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: categoryIdFromPath,
          tenantId: tenantIdFromToken,
        }),
      }),
    );
    // If victim's category has tenantId "tenant-victim", the query returns nothing
    // because we filter by tenantId = "tenant-attacker"
  });

  it("findAll uses tenantId from auth context", async () => {
    const tenantIdFromToken = "tenant-a";

    await repo.findAll(tenantIdFromToken, {
      page: 1,
      limit: 10,
      sortBy: "name",
      sortOrder: "asc",
      search: undefined,
    });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: tenantIdFromToken,
        }),
      }),
    );
  });
});
