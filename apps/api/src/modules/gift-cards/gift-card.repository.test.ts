import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindFirst = vi.fn();
const mockFindMany = vi.fn();
const mockCount = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockTxFindFirst = vi.fn();
const mockTxUpdate = vi.fn();

vi.mock("@/config/prisma", () => {
  const tx = {
    giftCard: {
      findFirst: (...a: unknown[]) => mockTxFindFirst(...a),
      update: (...a: unknown[]) => mockTxUpdate(...a),
    },
  };
  return {
    default: {
      giftCard: {
        findFirst: (...a: unknown[]) => mockFindFirst(...a),
        findMany: (...a: unknown[]) => mockFindMany(...a),
        count: (...a: unknown[]) => mockCount(...a),
        create: (...a: unknown[]) => mockCreate(...a),
        update: (...a: unknown[]) => mockUpdate(...a),
      },
      $transaction: async (
        fn: (tx: unknown) => Promise<unknown>,
      ): Promise<unknown> => fn(tx),
    },
  };
});

import giftCardRepository from "./gift-card.repository";

describe("GiftCardRepository", () => {
  const tenantId = "t1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("findMany uses select (drops purchaserId)", async () => {
    mockFindMany.mockResolvedValue([]);
    await giftCardRepository.findMany(
      { tenantId },
      { createdAt: "desc" },
      0,
      10,
    );
    const arg = mockFindMany.mock.calls[0][0];
    expect(arg.select).toBeDefined();
    expect(arg.include).toBeUndefined();
    expect(arg.select.purchaserId).toBeUndefined();
  });

  it("findFirstByCode trims and uppercases", async () => {
    mockFindFirst.mockResolvedValue(null);
    await giftCardRepository.findFirstByCode(tenantId, "  abc-123  ");
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId, code: "ABC-123" }),
      }),
    );
  });

  describe("redeem", () => {
    it("returns null when card missing", async () => {
      mockTxFindFirst.mockResolvedValue(null);
      const r = await giftCardRepository.redeem(tenantId, "NOPE", 100);
      expect(r).toBeNull();
      expect(mockTxUpdate).not.toHaveBeenCalled();
    });

    it("returns null when status is not ACTIVE", async () => {
      mockTxFindFirst.mockResolvedValue({
        id: "g1",
        balance: 1000,
        status: "VOIDED",
        expiresAt: null,
      });
      const r = await giftCardRepository.redeem(tenantId, "C1", 100);
      expect(r).toBeNull();
      expect(mockTxUpdate).not.toHaveBeenCalled();
    });

    it("returns null when expired", async () => {
      mockTxFindFirst.mockResolvedValue({
        id: "g1",
        balance: 1000,
        status: "ACTIVE",
        expiresAt: new Date(Date.now() - 1000),
      });
      const r = await giftCardRepository.redeem(tenantId, "C1", 100);
      expect(r).toBeNull();
    });

    it("returns null when balance < amount", async () => {
      mockTxFindFirst.mockResolvedValue({
        id: "g1",
        balance: 50,
        status: "ACTIVE",
        expiresAt: null,
      });
      const r = await giftCardRepository.redeem(tenantId, "C1", 100);
      expect(r).toBeNull();
    });

    it("decrements balance and keeps ACTIVE on partial draw", async () => {
      mockTxFindFirst.mockResolvedValue({
        id: "g1",
        balance: 1000,
        status: "ACTIVE",
        expiresAt: null,
      });
      mockTxUpdate.mockResolvedValue({
        id: "g1",
        code: "C1",
        balance: 700,
        status: "ACTIVE",
      });
      const r = await giftCardRepository.redeem(tenantId, "C1", 300);
      expect(r).toEqual({
        id: "g1",
        code: "C1",
        balance: 700,
        status: "ACTIVE",
      });
      expect(mockTxUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "g1" },
          data: expect.objectContaining({ balance: 700, status: "ACTIVE" }),
        }),
      );
    });

    it("transitions to REDEEMED on full draw", async () => {
      mockTxFindFirst.mockResolvedValue({
        id: "g1",
        balance: 500,
        status: "ACTIVE",
        expiresAt: null,
      });
      mockTxUpdate.mockResolvedValue({
        id: "g1",
        code: "C1",
        balance: 0,
        status: "REDEEMED",
      });
      const r = await giftCardRepository.redeem(tenantId, "C1", 500);
      expect(r?.status).toBe("REDEEMED");
      expect(mockTxUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ balance: 0, status: "REDEEMED" }),
        }),
      );
    });
  });
});
