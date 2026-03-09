import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getTransfers,
  getTransferById,
  createTransfer,
  getStatusLabel,
} from "./transfer.service";

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

vi.mock("@/features/locations", () => ({
  LocationType: {},
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("transfer.service", () => {
  describe("getTransfers", () => {
    it("calls GET /transfers with query params", async () => {
      mockGet.mockResolvedValue({
        data: {
          data: [],
          pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
        },
      });

      await getTransfers({ page: 1, limit: 20 });

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining("/transfers"),
      );
    });
  });

  describe("getTransferById", () => {
    it("calls GET /transfers/:id", async () => {
      mockGet.mockResolvedValue({
        data: {
          transfer: {
            id: "t1",
            transferCode: "T-001",
            status: "PENDING",
          },
        },
      });

      await getTransferById("t1");

      expect(mockGet).toHaveBeenCalledWith("/transfers/t1");
    });
  });

  describe("createTransfer", () => {
    it("calls POST /transfers with payload", async () => {
      mockPost.mockResolvedValue({
        data: {
          transfer: {
            id: "t1",
            transferCode: "T-001",
            fromLocationId: "l1",
            toLocationId: "l2",
            status: "PENDING",
          },
        },
      });

      await createTransfer({
        fromLocationId: "l1",
        toLocationId: "l2",
        items: [{ variationId: "v1", quantity: 1 }],
      });

      expect(mockPost).toHaveBeenCalledWith(
        "/transfers",
        expect.objectContaining({
          fromLocationId: "l1",
          toLocationId: "l2",
          items: [{ variationId: "v1", quantity: 1 }],
        }),
      );
    });
  });

  describe("getStatusLabel", () => {
    it("returns human-readable label for PENDING", () => {
      expect(getStatusLabel("PENDING")).toBe("Pending Approval");
    });
    it("returns human-readable label for COMPLETED", () => {
      expect(getStatusLabel("COMPLETED")).toBe("Completed");
    });
  });
});
