import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getSales,
  getSaleById,
  createSale,
  getSalesSummary,
} from "./sales.service";

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock("@/lib/axios", () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

vi.mock("@/lib/api-error", () => ({
  handleApiError: vi.fn((err: unknown) => {
    throw err;
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sales.service", () => {
  describe("getSales", () => {
    it("calls GET /sales with query params", async () => {
      mockGet.mockResolvedValue({
        data: {
          data: [],
          pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
        },
      });

      await getSales({ page: 1, limit: 20 });

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/sales?"));
      expect(mockGet).toHaveBeenCalledWith(expect.stringMatching(/page=1/));
    });
  });

  describe("getSaleById", () => {
    it("calls GET /sales/:id", async () => {
      mockGet.mockResolvedValue({
        data: { sale: { id: "s1", saleCode: "S-001", total: 100 } },
      });

      await getSaleById("s1");

      expect(mockGet).toHaveBeenCalledWith("/sales/s1");
    });
  });

  describe("createSale", () => {
    it("calls POST /sales with payload", async () => {
      mockPost.mockResolvedValue({
        data: {
          sale: {
            id: "s1",
            saleCode: "S-001",
            locationId: "loc1",
            total: 150,
          },
        },
      });

      await createSale({
        locationId: "loc1",
        items: [{ variationId: "v1", quantity: 1 }],
      });

      expect(mockPost).toHaveBeenCalledWith(
        "/sales",
        expect.objectContaining({
          locationId: "loc1",
          items: expect.any(Array),
        }),
      );
    });
  });

  describe("getSalesSummary", () => {
    it("calls GET /sales/analytics/summary", async () => {
      mockGet.mockResolvedValue({
        data: {
          summary: {
            totalSales: 10,
            totalRevenue: 1000,
            totalDiscount: 50,
            generalSales: { count: 5, revenue: 500 },
            memberSales: { count: 5, revenue: 500 },
          },
        },
      });

      await getSalesSummary({ startDate: "2025-01-01", endDate: "2025-01-31" });

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("/sales/analytics/summary?"),
      );
    });
  });
});
