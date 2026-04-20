import { describe, it, expect, vi, beforeEach } from "vitest";
import { GiftCardService } from "./gift-card.service";
import type { GiftCardRepository } from "./gift-card.repository";
import { createError } from "@/middlewares/errorHandler";

const mockFindFirstByCode = vi.fn();
const mockFindById = vi.fn();
const mockFindActiveByCode = vi.fn();
const mockCount = vi.fn();
const mockFindMany = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRedeem = vi.fn();

const mockRepo: GiftCardRepository = {
  findFirstByCode: mockFindFirstByCode,
  findById: mockFindById,
  findActiveByCode: mockFindActiveByCode,
  count: mockCount,
  findMany: mockFindMany,
  create: mockCreate,
  update: mockUpdate,
  redeem: mockRedeem,
} as unknown as GiftCardRepository;

const service = new GiftCardService(mockRepo);

describe("GiftCardService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("seeds balance = amount", async () => {
      mockFindFirstByCode.mockResolvedValue(null);
      mockCreate.mockResolvedValue({ id: "g1", code: "C1" });

      await service.create("t1", {
        code: "C1",
        amount: 5000,
        status: "ACTIVE",
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "t1",
          code: "C1",
          amount: 5000,
          balance: 5000,
          status: "ACTIVE",
        }),
      );
    });

    it("throws 409 on dup code", async () => {
      mockFindFirstByCode.mockResolvedValue({ id: "g0", code: "C1" });
      await expect(
        service.create("t1", {
          code: "C1",
          amount: 100,
          status: "ACTIVE",
        }),
      ).rejects.toMatchObject(
        createError("Gift card with this code already exists", 409),
      );
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("returns null when not found", async () => {
      mockFindById.mockResolvedValue(null);
      const r = await service.update("t1", "missing", { status: "VOIDED" });
      expect(r).toBeNull();
    });

    it("rejects balance > amount with 400", async () => {
      mockFindById.mockResolvedValue({ id: "g1", amount: 1000, balance: 500 });
      await expect(
        service.update("t1", "g1", { balance: 1500 }),
      ).rejects.toMatchObject(
        createError("Balance cannot exceed original amount", 400),
      );
    });

    it("passes through status update", async () => {
      mockFindById.mockResolvedValue({ id: "g1", amount: 1000, balance: 1000 });
      mockUpdate.mockResolvedValue({ id: "g1", status: "VOIDED" });
      const r = await service.update("t1", "g1", { status: "VOIDED" });
      expect(r).toEqual({ id: "g1", status: "VOIDED" });
      expect(mockUpdate).toHaveBeenCalledWith(
        "g1",
        expect.objectContaining({ status: "VOIDED" }),
      );
    });
  });

  describe("redeem", () => {
    it("404 when card not found", async () => {
      mockFindActiveByCode.mockResolvedValue(null);
      await expect(service.redeem("t1", "MISSING", 100)).rejects.toMatchObject(
        createError("Gift card not found", 404),
      );
    });

    it("409 when balance insufficient (repo returns null, status ACTIVE, not expired)", async () => {
      mockFindActiveByCode.mockResolvedValue({
        id: "g1",
        status: "ACTIVE",
        balance: 100,
        expiresAt: null,
      });
      mockRedeem.mockResolvedValue(null);
      await expect(service.redeem("t1", "C1", 500)).rejects.toMatchObject(
        createError("Insufficient gift card balance", 409),
      );
    });

    it("409 when card VOIDED", async () => {
      mockFindActiveByCode.mockResolvedValue({
        id: "g1",
        status: "VOIDED",
        balance: 1000,
        expiresAt: null,
      });
      mockRedeem.mockResolvedValue(null);
      await expect(service.redeem("t1", "C1", 100)).rejects.toMatchObject(
        createError("Gift card is voided", 409),
      );
    });

    it("409 when expired", async () => {
      mockFindActiveByCode.mockResolvedValue({
        id: "g1",
        status: "ACTIVE",
        balance: 1000,
        expiresAt: new Date(Date.now() - 86400_000),
      });
      mockRedeem.mockResolvedValue(null);
      await expect(service.redeem("t1", "C1", 100)).rejects.toMatchObject(
        createError("Gift card is expired", 409),
      );
    });

    it("returns updated row on success", async () => {
      mockFindActiveByCode.mockResolvedValue({
        id: "g1",
        status: "ACTIVE",
        balance: 1000,
        expiresAt: null,
      });
      mockRedeem.mockResolvedValue({
        id: "g1",
        code: "C1",
        balance: 500,
        status: "ACTIVE",
      });
      const r = await service.redeem("t1", "C1", 500);
      expect(r).toEqual({
        id: "g1",
        code: "C1",
        balance: 500,
        status: "ACTIVE",
      });
    });
  });
});
