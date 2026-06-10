import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/config/prisma", () => ({
  basePrisma: {
    abandonedCart: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import service from "./public-cart-pings.service";
import { basePrisma } from "@/config/prisma";

const mockBasePrisma = basePrisma as unknown as {
  abandonedCart: {
    upsert: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
};

describe("PublicCartPingsService", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("recordCartPing", () => {
    it("recomputes subtotal from unitPrice*quantity, ignoring client-supplied lineTotal", async () => {
      const mockUpsert = vi.fn();
      mockBasePrisma.abandonedCart.upsert = mockUpsert;

      await service.recordCartPing("t1", {
        sessionKey: "sess-1",
        items: [
          {
            productId: "p1",
            productName: "Lamp",
            unitPrice: 100,
            quantity: 2,
            lineTotal: 999999, // Bogus value from client
          },
          {
            productId: "p2",
            productName: "Bowl",
            unitPrice: 50,
            quantity: 3,
            lineTotal: 999999, // Bogus value from client
          },
        ],
        customerName: "Ada",
        customerPhone: "+977-98xxx",
        customerEmail: "ada@example.com",
      });

      const [callArg] = mockUpsert.mock.calls[0];
      // subtotal should be (100*2) + (50*3) = 200 + 150 = 350, not something with 999999
      expect(callArg.create.subtotal).toBe(350);
      expect(callArg.update.subtotal).toBe(350);
    });

    it("persists items with lineTotal normalized to unitPrice*quantity", async () => {
      const mockUpsert = vi.fn();
      mockBasePrisma.abandonedCart.upsert = mockUpsert;

      await service.recordCartPing("t1", {
        sessionKey: "sess-1",
        items: [
          {
            productId: "p1",
            productName: "Lamp",
            unitPrice: 100,
            quantity: 2,
            lineTotal: 500, // Wrong value from client
          },
        ],
        customerName: "Ada",
        customerPhone: "+977-98xxx",
        customerEmail: null,
      });

      const [callArg] = mockUpsert.mock.calls[0];
      const upsertedItems = callArg.create.items;
      expect(upsertedItems[0]).toMatchObject({
        productId: "p1",
        unitPrice: 100,
        quantity: 2,
        lineTotal: 200, // Should be recomputed to unitPrice*quantity
      });
    });

    it("calls deleteMany with tenantId and sessionKey when items array is empty", async () => {
      const mockDeleteMany = vi.fn();
      mockBasePrisma.abandonedCart.deleteMany = mockDeleteMany;

      await service.recordCartPing("t1", {
        sessionKey: "sess-2",
        items: [],
        customerName: "Ada",
        customerPhone: "+977",
        customerEmail: null,
      });

      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: { tenantId: "t1", sessionKey: "sess-2" },
      });
    });

    it("does not call upsert when items array is empty", async () => {
      const mockUpsert = vi.fn();
      mockBasePrisma.abandonedCart.upsert = mockUpsert;

      await service.recordCartPing("t1", {
        sessionKey: "sess-2",
        items: [],
        customerName: "Ada",
        customerPhone: "+977",
        customerEmail: null,
      });

      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("normalizes empty customerName to null", async () => {
      const mockUpsert = vi.fn();
      mockBasePrisma.abandonedCart.upsert = mockUpsert;

      await service.recordCartPing("t1", {
        sessionKey: "sess-1",
        items: [
          {
            productId: "p1",
            productName: "Lamp",
            unitPrice: 100,
            quantity: 1,
            lineTotal: 100,
          },
        ],
        customerName: "   ",
        customerPhone: "+977-98xxx",
        customerEmail: null,
      });

      const [callArg] = mockUpsert.mock.calls[0];
      expect(callArg.create.customerName).toBe(null);
      expect(callArg.update.customerName).toBe(null);
    });

    it("normalizes whitespace-only customerPhone to null", async () => {
      const mockUpsert = vi.fn();
      mockBasePrisma.abandonedCart.upsert = mockUpsert;

      await service.recordCartPing("t1", {
        sessionKey: "sess-1",
        items: [
          {
            productId: "p1",
            productName: "Lamp",
            unitPrice: 100,
            quantity: 1,
            lineTotal: 100,
          },
        ],
        customerName: "Ada",
        customerPhone: "   ",
        customerEmail: null,
      });

      const [callArg] = mockUpsert.mock.calls[0];
      expect(callArg.create.customerPhone).toBe(null);
      expect(callArg.update.customerPhone).toBe(null);
    });

    it("normalizes undefined contact fields to null", async () => {
      const mockUpsert = vi.fn();
      mockBasePrisma.abandonedCart.upsert = mockUpsert;

      await service.recordCartPing("t1", {
        sessionKey: "sess-1",
        items: [
          {
            productId: "p1",
            productName: "Lamp",
            unitPrice: 100,
            quantity: 1,
            lineTotal: 100,
          },
        ],
        customerName: undefined as any,
        customerPhone: undefined as any,
        customerEmail: undefined as any,
      });

      const [callArg] = mockUpsert.mock.calls[0];
      expect(callArg.create.customerName).toBe(null);
      expect(callArg.create.customerPhone).toBe(null);
      expect(callArg.create.customerEmail).toBe(null);
    });

    it("preserves trimmed contact fields", async () => {
      const mockUpsert = vi.fn();
      mockBasePrisma.abandonedCart.upsert = mockUpsert;

      await service.recordCartPing("t1", {
        sessionKey: "sess-1",
        items: [
          {
            productId: "p1",
            productName: "Lamp",
            unitPrice: 100,
            quantity: 1,
            lineTotal: 100,
          },
        ],
        customerName: "  Ada  ",
        customerPhone: "  +977-98xxx  ",
        customerEmail: "  ada@example.com  ",
      });

      const [callArg] = mockUpsert.mock.calls[0];
      expect(callArg.create.customerName).toBe("Ada");
      expect(callArg.create.customerPhone).toBe("+977-98xxx");
      expect(callArg.create.customerEmail).toBe("ada@example.com");
    });

    it("resets notifiedAt on every activity ping", async () => {
      const mockUpsert = vi.fn();
      mockBasePrisma.abandonedCart.upsert = mockUpsert;

      await service.recordCartPing("t1", {
        sessionKey: "sess-1",
        items: [
          {
            productId: "p1",
            productName: "Lamp",
            unitPrice: 100,
            quantity: 1,
            lineTotal: 100,
          },
        ],
        customerName: "Ada",
        customerPhone: "+977",
        customerEmail: null,
      });

      const [callArg] = mockUpsert.mock.calls[0];
      expect(callArg.create.notifiedAt).toBe(null);
      expect(callArg.update.notifiedAt).toBe(null);
    });

    it("sets lastActivityAt to current date on upsert", async () => {
      const mockUpsert = vi.fn();
      mockBasePrisma.abandonedCart.upsert = mockUpsert;

      const beforeCall = new Date();
      await service.recordCartPing("t1", {
        sessionKey: "sess-1",
        items: [
          {
            productId: "p1",
            productName: "Lamp",
            unitPrice: 100,
            quantity: 1,
            lineTotal: 100,
          },
        ],
        customerName: "Ada",
        customerPhone: "+977",
        customerEmail: null,
      });
      const afterCall = new Date();

      const [callArg] = mockUpsert.mock.calls[0];
      const lastActivityAt = callArg.create.lastActivityAt;
      expect(lastActivityAt.getTime()).toBeGreaterThanOrEqual(
        beforeCall.getTime(),
      );
      expect(lastActivityAt.getTime()).toBeLessThanOrEqual(afterCall.getTime());
    });
  });
});
