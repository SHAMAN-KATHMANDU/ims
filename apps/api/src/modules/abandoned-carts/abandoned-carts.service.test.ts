import { describe, it, expect, vi, beforeEach } from "vitest";

const { abandonedCartDelegate, publishDomainEvent } = vi.hoisted(() => ({
  abandonedCartDelegate: {
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  publishDomainEvent: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({
  basePrisma: { abandonedCart: abandonedCartDelegate },
  default: {},
}));

vi.mock("@/config/logger", () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/modules/automation/automation.service", () => ({
  default: { publishDomainEvent },
}));

import { sweepAbandonedCarts } from "./abandoned-carts.service";
import { logger } from "@/config/logger";

type CartRow = {
  id: string;
  tenantId: string;
  sessionKey: string;
  items: Array<Record<string, unknown>>;
  subtotal: { toString: () => string };
  currency: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  lastActivityAt: Date;
  notifiedAt: Date | null;
};

function cart(overrides: Partial<CartRow> = {}): CartRow {
  return {
    id: "cart-1",
    tenantId: "t1",
    sessionKey: "s1",
    items: [{ productId: "p1", qty: 2 }],
    subtotal: { toString: () => "19.99" },
    currency: "USD",
    customerName: null,
    customerPhone: null,
    customerEmail: null,
    lastActivityAt: new Date("2026-01-01T00:00:00Z"),
    notifiedAt: null,
    ...overrides,
  };
}

describe("sweepAbandonedCarts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    abandonedCartDelegate.deleteMany.mockResolvedValue({ count: 0 });
  });

  it("returns zero counters when no stale carts exist", async () => {
    abandonedCartDelegate.findMany.mockResolvedValue([]);
    const result = await sweepAbandonedCarts();
    expect(result).toEqual({ found: 0, fired: 0, purged: 0 });
    expect(publishDomainEvent).not.toHaveBeenCalled();
  });

  it("fires cart.abandoned event and stamps notifiedAt on success", async () => {
    const row = cart();
    abandonedCartDelegate.findMany.mockResolvedValue([row]);
    publishDomainEvent.mockResolvedValue(undefined);
    abandonedCartDelegate.update.mockResolvedValue(undefined);

    const result = await sweepAbandonedCarts();

    expect(publishDomainEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "t1",
        eventName: "cart.abandoned",
        scopeType: "GLOBAL",
        entityType: "ABANDONED_CART",
        entityId: "cart-1",
        dedupeKey: `cart-abandoned:cart-1:${row.lastActivityAt.toISOString()}`,
        payload: expect.objectContaining({
          cartId: "cart-1",
          sessionKey: "s1",
          subtotal: "19.99",
          currency: "USD",
          itemCount: 1,
        }),
      }),
    );
    expect(abandonedCartDelegate.update).toHaveBeenCalledWith({
      where: { id: "cart-1" },
      data: { notifiedAt: expect.any(Date) },
    });
    expect(result).toEqual({ found: 1, fired: 1, purged: 0 });
  });

  it("deletes empty carts instead of firing an event", async () => {
    abandonedCartDelegate.findMany.mockResolvedValue([
      cart({ id: "empty-1", items: [] }),
    ]);
    abandonedCartDelegate.delete.mockResolvedValue(undefined);

    const result = await sweepAbandonedCarts();

    expect(publishDomainEvent).not.toHaveBeenCalled();
    expect(abandonedCartDelegate.delete).toHaveBeenCalledWith({
      where: { id: "empty-1" },
    });
    expect(result.fired).toBe(0);
    expect(result.found).toBe(1);
  });

  it("swallows delete failures on empty-cart cleanup", async () => {
    abandonedCartDelegate.findMany.mockResolvedValue([
      cart({ id: "empty-1", items: [] }),
    ]);
    abandonedCartDelegate.delete.mockRejectedValue(
      new Error("row vanished mid-sweep"),
    );

    await expect(sweepAbandonedCarts()).resolves.toEqual(
      expect.objectContaining({ fired: 0 }),
    );
  });

  it("logs and skips when event publish fails without stamping notifiedAt", async () => {
    abandonedCartDelegate.findMany.mockResolvedValue([cart({ id: "bad-1" })]);
    publishDomainEvent.mockRejectedValue(new Error("broker down"));

    const result = await sweepAbandonedCarts();

    expect(abandonedCartDelegate.update).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      "sweepAbandonedCarts: publish failed for cart",
      undefined,
      expect.objectContaining({ cartId: "bad-1", tenantId: "t1" }),
    );
    expect(result).toEqual({ found: 1, fired: 0, purged: 0 });
  });

  it("continues processing remaining carts after one publish failure", async () => {
    abandonedCartDelegate.findMany.mockResolvedValue([
      cart({ id: "bad-1" }),
      cart({ id: "good-1" }),
    ]);
    publishDomainEvent
      .mockRejectedValueOnce(new Error("broker flapped"))
      .mockResolvedValueOnce(undefined);
    abandonedCartDelegate.update.mockResolvedValue(undefined);

    const result = await sweepAbandonedCarts();

    expect(publishDomainEvent).toHaveBeenCalledTimes(2);
    expect(abandonedCartDelegate.update).toHaveBeenCalledTimes(1);
    expect(abandonedCartDelegate.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "good-1" } }),
    );
    expect(result).toEqual({ found: 2, fired: 1, purged: 0 });
  });

  it("purges rows older than the purge cutoff", async () => {
    abandonedCartDelegate.findMany.mockResolvedValue([]);
    abandonedCartDelegate.deleteMany.mockResolvedValue({ count: 7 });

    const result = await sweepAbandonedCarts();

    expect(abandonedCartDelegate.deleteMany).toHaveBeenCalledWith({
      where: { lastActivityAt: { lt: expect.any(Date) } },
    });
    expect(result.purged).toBe(7);
  });

  it("queries findMany with notifiedAt=null and idle-cutoff filter", async () => {
    abandonedCartDelegate.findMany.mockResolvedValue([]);

    await sweepAbandonedCarts();

    expect(abandonedCartDelegate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          notifiedAt: null,
          lastActivityAt: { lt: expect.any(Date) },
        }),
        take: 100,
        orderBy: { lastActivityAt: "asc" },
      }),
    );
  });
});
