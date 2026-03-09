import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getPromos,
  getPromoById,
  createPromo,
  searchPromoByCode,
} from "./promo.service";

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

describe("promo.service", () => {
  describe("getPromos", () => {
    it("calls GET /promos with query params", async () => {
      mockGet.mockResolvedValue({
        data: {
          data: [],
          pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
        },
      });

      await getPromos({ page: 1, limit: 20 });

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/promos"));
    });
  });

  describe("getPromoById", () => {
    it("calls GET /promos/:id", async () => {
      mockGet.mockResolvedValue({
        data: {
          promo: {
            id: "p1",
            code: "SAVE10",
            valueType: "PERCENTAGE",
            value: 10,
          },
        },
      });

      await getPromoById("p1");

      expect(mockGet).toHaveBeenCalledWith("/promos/p1");
    });
  });

  describe("createPromo", () => {
    it("calls POST /promos with payload", async () => {
      mockPost.mockResolvedValue({
        data: {
          promo: {
            id: "p1",
            code: "SAVE10",
            valueType: "PERCENTAGE",
            value: 10,
          },
        },
      });

      await createPromo({
        code: "SAVE10",
        valueType: "PERCENTAGE",
        value: 10,
      });

      expect(mockPost).toHaveBeenCalledWith(
        "/promos",
        expect.objectContaining({
          code: "SAVE10",
          valueType: "PERCENTAGE",
          value: 10,
        }),
      );
    });
  });

  describe("searchPromoByCode", () => {
    it("returns null for empty code", async () => {
      const result = await searchPromoByCode("");
      expect(result).toBeNull();
    });
    it("returns null when no match found", async () => {
      mockGet.mockResolvedValue({
        data: {
          data: [],
          pagination: { page: 1, limit: 1, totalItems: 0, totalPages: 0 },
        },
      });
      const result = await searchPromoByCode("NOTFOUND");
      expect(result).toBeNull();
    });
  });
});
