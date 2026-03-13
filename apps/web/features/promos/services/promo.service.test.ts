import { describe, it, expect, vi, beforeEach } from "vitest";
import { AxiosError } from "axios";
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
    it("returns null when 404 (promo not found)", async () => {
      const err = new AxiosError(
        "Not found",
        "ERR_BAD_REQUEST",
        undefined,
        undefined,
        {
          status: 404,
          statusText: "",
          data: {},
          headers: {},
          config: {} as never,
        },
      );
      mockGet.mockRejectedValue(err);
      const result = await searchPromoByCode("NOTFOUND");
      expect(result).toBeNull();
      expect(mockGet).toHaveBeenCalledWith("/promos/by-code/NOTFOUND");
    });
    it("rethrows on 5xx so caller can show error (not 'promo not found')", async () => {
      const err = new AxiosError(
        "Server error",
        "ERR_BAD_RESPONSE",
        undefined,
        undefined,
        {
          status: 500,
          statusText: "",
          data: {},
          headers: {},
          config: {} as never,
        },
      );
      mockGet.mockRejectedValue(err);
      await expect(searchPromoByCode("SAVE10")).rejects.toThrow();
    });
    it("returns promo when found", async () => {
      const promo = {
        id: "p1",
        code: "SAVE10",
        valueType: "PERCENTAGE" as const,
        value: 10,
      };
      mockGet.mockResolvedValue({
        data: {
          message: "Promo code fetched successfully",
          promo,
        },
      });
      const result = await searchPromoByCode("SAVE10");
      expect(result).toEqual(promo);
      expect(mockGet).toHaveBeenCalledWith("/promos/by-code/SAVE10");
    });
  });
});
