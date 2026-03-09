import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getLocations,
  getLocationById,
  createLocation,
  getActiveLocations,
} from "./location.service";

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

describe("location.service", () => {
  describe("getLocations", () => {
    it("calls GET /locations with query params", async () => {
      mockGet.mockResolvedValue({
        data: {
          data: [],
          pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
        },
      });

      await getLocations({ page: 1, limit: 20 });

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("/locations"),
      );
    });
  });

  describe("getLocationById", () => {
    it("calls GET /locations/:id", async () => {
      mockGet.mockResolvedValue({
        data: {
          location: {
            id: "l1",
            name: "Main",
            type: "WAREHOUSE",
            isActive: true,
          },
        },
      });

      await getLocationById("l1");

      expect(mockGet).toHaveBeenCalledWith("/locations/l1");
    });
  });

  describe("createLocation", () => {
    it("calls POST /locations with payload", async () => {
      mockPost.mockResolvedValue({
        data: {
          location: { id: "l1", name: "Warehouse A", type: "WAREHOUSE" },
        },
      });

      await createLocation({ name: "Warehouse A" });

      expect(mockPost).toHaveBeenCalledWith(
        "/locations",
        expect.objectContaining({ name: "Warehouse A" }),
      );
    });
  });

  describe("getActiveLocations", () => {
    it("calls GET /locations with activeOnly=true", async () => {
      mockGet.mockResolvedValue({ data: { data: [] } });

      await getActiveLocations();

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("activeOnly=true"),
      );
    });
  });
});
