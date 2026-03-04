import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getVendors,
  getVendorById,
  createVendor,
  getVendorProducts,
} from "./vendor.service";

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

describe("vendor.service", () => {
  describe("getVendors", () => {
    it("calls GET /vendors with query params", async () => {
      mockGet.mockResolvedValue({
        data: {
          data: [],
          pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
        },
      });

      await getVendors({ page: 1, limit: 20 });

      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/vendors"));
    });
  });

  describe("getVendorById", () => {
    it("calls GET /vendors/:id", async () => {
      mockGet.mockResolvedValue({
        data: { vendor: { id: "v1", name: "Vendor A" } },
      });

      await getVendorById("v1");

      expect(mockGet).toHaveBeenCalledWith("/vendors/v1");
    });
  });

  describe("createVendor", () => {
    it("calls POST /vendors with payload", async () => {
      mockPost.mockResolvedValue({
        data: { vendor: { id: "v1", name: "Vendor A" } },
      });

      await createVendor({ name: "Vendor A" });

      expect(mockPost).toHaveBeenCalledWith(
        "/vendors",
        expect.objectContaining({ name: "Vendor A" }),
      );
    });
  });

  describe("getVendorProducts", () => {
    it("calls GET /vendors/:id/products", async () => {
      mockGet.mockResolvedValue({
        data: {
          data: [],
          pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 0 },
        },
      });

      await getVendorProducts("v1");

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("/vendors/v1/products"),
      );
    });
  });
});
