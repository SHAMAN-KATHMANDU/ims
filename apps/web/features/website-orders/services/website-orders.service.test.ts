import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listWebsiteOrders,
  getWebsiteOrder,
  verifyWebsiteOrder,
  rejectWebsiteOrder,
  convertWebsiteOrder,
  deleteWebsiteOrder,
} from "./website-orders.service";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/axios", () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
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

describe("website-orders.service", () => {
  it("listWebsiteOrders GETs /website-orders with query", async () => {
    mockGet.mockResolvedValue({
      data: { orders: [], total: 0, page: 1, limit: 20 },
    });
    await listWebsiteOrders({ status: "PENDING_VERIFICATION", page: 2 });
    expect(mockGet).toHaveBeenCalledWith("/website-orders", {
      params: { status: "PENDING_VERIFICATION", page: 2 },
    });
  });

  it("getWebsiteOrder GETs /website-orders/:id", async () => {
    mockGet.mockResolvedValue({ data: { order: { id: "o1" } } });
    const order = await getWebsiteOrder("o1");
    expect(mockGet).toHaveBeenCalledWith("/website-orders/o1");
    expect(order.id).toBe("o1");
  });

  it("getWebsiteOrder throws without id", async () => {
    await expect(getWebsiteOrder("")).rejects.toThrow();
  });

  it("verifyWebsiteOrder POSTs /verify", async () => {
    mockPost.mockResolvedValue({ data: { order: { id: "o1" } } });
    await verifyWebsiteOrder("o1");
    expect(mockPost).toHaveBeenCalledWith("/website-orders/o1/verify", {});
  });

  it("rejectWebsiteOrder POSTs /reject with reason", async () => {
    mockPost.mockResolvedValue({ data: { order: { id: "o1" } } });
    await rejectWebsiteOrder("o1", { reason: "spam call" });
    expect(mockPost).toHaveBeenCalledWith("/website-orders/o1/reject", {
      reason: "spam call",
    });
  });

  it("convertWebsiteOrder POSTs /convert with payload", async () => {
    mockPost.mockResolvedValue({ data: { order: { id: "o1" } } });
    await convertWebsiteOrder("o1", {
      locationId: "loc-1",
      payments: [{ method: "cash", amount: 1000 }],
    });
    expect(mockPost).toHaveBeenCalledWith(
      "/website-orders/o1/convert",
      expect.objectContaining({
        locationId: "loc-1",
        payments: [{ method: "cash", amount: 1000 }],
      }),
    );
  });

  it("deleteWebsiteOrder DELETEs /website-orders/:id", async () => {
    mockDelete.mockResolvedValue({});
    await deleteWebsiteOrder("o1");
    expect(mockDelete).toHaveBeenCalledWith("/website-orders/o1");
  });
});
