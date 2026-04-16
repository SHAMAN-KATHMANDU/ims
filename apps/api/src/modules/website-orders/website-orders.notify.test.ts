import { describe, it, expect, vi, beforeEach } from "vitest";

const findMany = vi.fn();
const create = vi.fn();

vi.mock("@/config/prisma", () => ({
  basePrisma: {
    user: {
      findMany: (...args: unknown[]) => findMany(...args),
    },
  },
}));

vi.mock("@/modules/notifications/notification.repository", () => ({
  default: {
    create: (...args: unknown[]) => create(...args),
  },
}));

vi.mock("@/config/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn() },
}));

import { notifyNewOrder } from "./website-orders.notify";

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: "o1",
    tenantId: "t1",
    orderCode: "WO-2026-0001",
    status: "PENDING_VERIFICATION",
    customerName: "Ada",
    customerPhone: "+977-98xxx",
    customerEmail: null,
    customerNote: null,
    items: [
      {
        productId: "prod-1",
        productName: "Lamp",
        unitPrice: 1000,
        quantity: 2,
        lineTotal: 2000,
      },
    ],
    subtotal: { toString: () => "2000" },
    currency: "NPR",
    sourceIp: null,
    sourceUserAgent: null,
    verifiedAt: null,
    verifiedById: null,
    rejectedAt: null,
    rejectedById: null,
    rejectionReason: null,
    convertedAt: null,
    convertedById: null,
    convertedSaleId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as any;
}

describe("notifyNewOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fans out a notification to every admin in the tenant", async () => {
    findMany.mockResolvedValue([{ id: "u1" }, { id: "u2" }, { id: "u3" }]);
    create.mockResolvedValue({ id: "n1" });

    await notifyNewOrder("t1", order());

    expect(findMany).toHaveBeenCalledWith({
      where: {
        tenantId: "t1",
        role: { in: ["admin", "superAdmin"] },
      },
      select: { id: true },
    });
    expect(create).toHaveBeenCalledTimes(3);

    const firstCall = create.mock.calls[0][0];
    expect(firstCall.userId).toBe("u1");
    expect(firstCall.type).toBe("WEBSITE_ORDER_NEW");
    expect(firstCall.title).toBe("New order WO-2026-0001");
    expect(firstCall.message).toContain("Ada");
    expect(firstCall.message).toContain("1 item");
    expect(firstCall.message).toContain("NPR 2000");
    expect(firstCall.resourceType).toBe("website_order");
    expect(firstCall.resourceId).toBe("o1");
  });

  it("formats item count pluralization", async () => {
    findMany.mockResolvedValue([{ id: "u1" }]);
    create.mockResolvedValue({ id: "n1" });

    await notifyNewOrder(
      "t1",
      order({
        items: [
          {
            productId: "p1",
            productName: "A",
            unitPrice: 100,
            quantity: 1,
            lineTotal: 100,
          },
          {
            productId: "p2",
            productName: "B",
            unitPrice: 200,
            quantity: 2,
            lineTotal: 400,
          },
        ],
      }),
    );

    const call = create.mock.calls[0][0];
    expect(call.message).toContain("2 items");
  });

  it("no-ops with a warn when the tenant has no admins", async () => {
    findMany.mockResolvedValue([]);
    await notifyNewOrder("t1", order());
    expect(create).not.toHaveBeenCalled();
  });

  it("continues after a per-user insert failure", async () => {
    findMany.mockResolvedValue([{ id: "u1" }, { id: "u2" }]);
    create
      .mockRejectedValueOnce(new Error("db went sideways"))
      .mockResolvedValueOnce({ id: "n1" });

    await notifyNewOrder("t1", order());
    // Both attempts should happen despite the first throwing.
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("swallows a top-level findMany failure", async () => {
    findMany.mockRejectedValue(new Error("db down"));
    // Must not throw — the public-orders controller awaits this and a
    // thrown error here would 500 the guest checkout.
    await expect(notifyNewOrder("t1", order())).resolves.toBeUndefined();
    expect(create).not.toHaveBeenCalled();
  });
});
