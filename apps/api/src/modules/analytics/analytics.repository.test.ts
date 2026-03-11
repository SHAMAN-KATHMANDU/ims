/**
 * Unit tests for AnalyticsRepository — getOverviewData.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockProductCount = vi.fn();
const mockUserCount = vi.fn();
const mockUserFindMany = vi.fn();
const mockProductFindMany = vi.fn();

vi.mock("@/config/prisma", () => ({
  default: {
    product: {
      count: (...args: unknown[]) => mockProductCount(...args),
      findMany: (...args: unknown[]) => mockProductFindMany(...args),
    },
    user: {
      count: (...args: unknown[]) => mockUserCount(...args),
      findMany: (...args: unknown[]) => mockUserFindMany(...args),
    },
  },
}));

import analyticsRepository from "./analytics.repository";

describe("AnalyticsRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProductCount.mockResolvedValue(100);
    mockUserCount.mockResolvedValue(5);
    mockUserFindMany.mockResolvedValue([]);
    mockProductFindMany.mockResolvedValue([]);
  });

  describe("getOverviewData", () => {
    it("returns overview with totalProducts and totalUsers", async () => {
      const result = await analyticsRepository.getOverviewData();

      expect(result.totalProducts).toBe(100);
      expect(result.totalUsers).toBe(5);
      expect(result).toHaveProperty("allUsers");
      expect(result).toHaveProperty("recentProducts");
      expect(result).toHaveProperty("recentUsers");
      expect(result).toHaveProperty("productsWithMrp");
    });
  });
});
