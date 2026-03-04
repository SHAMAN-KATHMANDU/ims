import { describe, it, expect, vi, beforeEach } from "vitest";
import { getProducts, getProductById } from "./product.service";

const mockGet = vi.fn();

vi.mock("@/lib/axios", () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
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

describe("product.service", () => {
  describe("getProducts", () => {
    it("calls GET /products with query params", async () => {
      mockGet.mockResolvedValue({
        data: {
          data: [],
          pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
        },
      });

      await getProducts({ page: 1, limit: 20 });

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("/products?"),
      );
      expect(mockGet).toHaveBeenCalledWith(expect.stringMatching(/page=1/));
    });
  });

  describe("getProductById", () => {
    it("calls GET /products/:id", async () => {
      mockGet.mockResolvedValue({
        data: { product: { id: "p1", name: "Test" } },
      });

      await getProductById("p1");

      expect(mockGet).toHaveBeenCalledWith("/products/p1");
    });
  });
});
