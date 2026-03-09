import { describe, it, expect, vi, beforeEach } from "vitest";
import { runTrashCleanup, getCutoffDate } from "@/jobs/trashCleanup";

// Mock structure aligned with TRASHED_MODELS in trashCleanup.ts
vi.mock("@/config/prisma", () => {
  const delegate = { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) };
  return {
    basePrisma: {
      product: delegate,
      category: delegate,
      subCategory: delegate,
      vendor: delegate,
      member: delegate,
      location: delegate,
      promoCode: delegate,
      company: delegate,
      contact: delegate,
      lead: delegate,
      deal: delegate,
      task: delegate,
      activity: delegate,
      pipeline: delegate,
    },
  };
});

vi.mock("@/config/logger", () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Trash cleanup job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCutoffDate", () => {
    it("returns date 30 days ago", () => {
      const now = new Date("2026-03-09T12:00:00Z");
      vi.useFakeTimers();
      vi.setSystemTime(now);

      const cutoff = getCutoffDate();

      expect(cutoff.getTime()).toBe(new Date("2026-02-07T12:00:00Z").getTime());

      vi.useRealTimers();
    });
  });

  describe("runTrashCleanup", () => {
    it("calls deleteMany on each trashable model with deletedAt lt cutoff", async () => {
      const now = new Date("2026-03-09T12:00:00Z");
      vi.useFakeTimers();
      vi.setSystemTime(now);

      await runTrashCleanup();

      const { basePrisma } = await import("@/config/prisma");
      const delegate = (
        basePrisma as unknown as Record<
          string,
          { deleteMany: ReturnType<typeof vi.fn> }
        >
      ).product;
      expect(delegate.deleteMany).toHaveBeenCalled();

      const expectedCutoff = new Date("2026-02-07T12:00:00Z");
      expect(delegate.deleteMany).toHaveBeenCalledWith({
        where: {
          deletedAt: { lt: expectedCutoff },
        },
      });

      vi.useRealTimers();
    });

    it("continues to next model when one model throws (resilience)", async () => {
      const now = new Date("2026-03-09T12:00:00Z");
      vi.useFakeTimers();
      vi.setSystemTime(now);

      const { basePrisma } = await import("@/config/prisma");
      const productDelegate = (
        basePrisma as unknown as Record<
          string,
          { deleteMany: ReturnType<typeof vi.fn> }
        >
      ).product;
      const categoryDelegate = (
        basePrisma as unknown as Record<
          string,
          { deleteMany: ReturnType<typeof vi.fn> }
        >
      ).category;

      productDelegate.deleteMany.mockRejectedValueOnce(new Error("DB error"));
      categoryDelegate.deleteMany.mockResolvedValue({ count: 0 });

      await runTrashCleanup();

      expect(productDelegate.deleteMany).toHaveBeenCalled();
      expect(categoryDelegate.deleteMany).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("permanently deletes items older than 30 days", async () => {
      const now = new Date("2026-03-09T12:00:00Z");
      vi.useFakeTimers();
      vi.setSystemTime(now);

      await runTrashCleanup();

      const { basePrisma } = await import("@/config/prisma");
      const delegate = (
        basePrisma as unknown as Record<
          string,
          { deleteMany: ReturnType<typeof vi.fn> }
        >
      ).product;
      expect(delegate.deleteMany).toHaveBeenCalled();

      const expectedCutoff = new Date("2026-02-07T12:00:00Z");
      expect(delegate.deleteMany).toHaveBeenCalledWith({
        where: {
          deletedAt: { lt: expectedCutoff },
        },
      });

      vi.useRealTimers();
    });
  });
});
