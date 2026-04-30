/**
 * Focused tests for the per-request memoization in SitesRepository.findConfig.
 * Verifies:
 *  - inside a `runWithTenant` context, duplicate calls collapse to one DB hit
 *  - outside a tenant context the memo is inactive (tests / scripts)
 *  - updateConfig invalidates the memo so subsequent reads see the write
 *
 * Also tests publishAllDrafts for atomic promotion of drafts and config flip.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { findUnique, update, findMany, $transaction } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  findMany: vi.fn(),
  $transaction: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({
  default: {
    siteConfig: { findUnique, update },
    siteLayout: { findMany, findUnique: vi.fn() },
    $transaction,
  },
  basePrisma: { siteConfig: { findUnique, update } },
}));

import sitesRepo from "./sites.repository";
import { runWithTenant } from "@/config/tenantContext";

describe("SitesRepository.findConfig memoization", () => {
  beforeEach(() => {
    findUnique.mockReset();
    update.mockReset();
    findUnique.mockResolvedValue({
      id: "sc1",
      tenantId: "t1",
      websiteEnabled: true,
      isPublished: true,
      template: null,
    });
  });

  it("dedupes duplicate reads within a single tenant context", async () => {
    await runWithTenant("t1", async () => {
      const a = sitesRepo.findConfig("t1");
      const b = sitesRepo.findConfig("t1");
      const c = sitesRepo.findConfig("t1");
      await Promise.all([a, b, c]);
    });
    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  it("returns the same promise reference to concurrent callers", async () => {
    await runWithTenant("t1", async () => {
      const a = sitesRepo.findConfig("t1");
      const b = sitesRepo.findConfig("t1");
      expect(a).toBe(b);
      await Promise.all([a, b]);
    });
  });

  it("does not leak cache across separate runWithTenant contexts", async () => {
    await runWithTenant("t1", async () => {
      await sitesRepo.findConfig("t1");
    });
    await runWithTenant("t1", async () => {
      await sitesRepo.findConfig("t1");
    });
    expect(findUnique).toHaveBeenCalledTimes(2);
  });

  it("falls through to prisma uncached when no tenant context is active", async () => {
    await sitesRepo.findConfig("t1");
    await sitesRepo.findConfig("t1");
    expect(findUnique).toHaveBeenCalledTimes(2);
  });

  it("updateConfig invalidates the memo so later reads re-fetch", async () => {
    update.mockResolvedValue({
      id: "sc1",
      tenantId: "t1",
      websiteEnabled: true,
      isPublished: true,
      branding: { theme: "dark" },
      template: null,
    });
    await runWithTenant("t1", async () => {
      await sitesRepo.findConfig("t1");
      expect(findUnique).toHaveBeenCalledTimes(1);

      await sitesRepo.updateConfig("t1", { branding: { theme: "dark" } });

      await sitesRepo.findConfig("t1");
      expect(findUnique).toHaveBeenCalledTimes(2);
    });
  });
});

describe("SitesRepository.publishAllDrafts", () => {
  beforeEach(() => {
    findUnique.mockReset();
    findMany.mockReset();
    $transaction.mockReset();
  });

  it("promotes drafts atomically and flips config in transaction", async () => {
    const mockConfig = {
      id: "sc1",
      tenantId: "t1",
      websiteEnabled: true,
      isPublished: false,
      template: null,
    };

    const mockLayouts = [{ id: "l1" }, { id: "l2" }];

    findUnique.mockResolvedValue(mockConfig);
    findMany.mockResolvedValue(mockLayouts);

    const updatedConfig = {
      id: "sc1",
      tenantId: "t1",
      websiteEnabled: true,
      isPublished: true,
      template: null,
    };

    // Mock the transaction callback to execute and return the updated config
    $transaction.mockImplementation(async (callback: Function) => {
      const mockTx = {
        siteLayout: {
          findUnique: vi.fn().mockResolvedValue({
            id: "l1",
            draftBlocks: [{ id: "b1" }],
          }),
          update: vi.fn().mockResolvedValue({}),
        },
        siteConfig: {
          update: vi.fn().mockResolvedValue(updatedConfig),
        },
      };
      return callback(mockTx);
    });

    await runWithTenant("t1", async () => {
      const result = await sitesRepo.publishAllDrafts("t1");
      expect(result.siteConfig.isPublished).toBe(true);
      expect(result.promoted).toBe(2);
      expect(result.wasNoOp).toBe(false);
      expect($transaction).toHaveBeenCalled();
    });
  });

  it("returns early on idempotent publish (no drafts, already published)", async () => {
    const mockConfig = {
      id: "sc1",
      tenantId: "t1",
      websiteEnabled: true,
      isPublished: true,
      template: null,
    };

    findUnique.mockResolvedValue(mockConfig);
    findMany.mockResolvedValue([]);

    await runWithTenant("t1", async () => {
      const result = await sitesRepo.publishAllDrafts("t1");
      expect(result.siteConfig.isPublished).toBe(true);
      expect(result.promoted).toBe(0);
      expect(result.wasNoOp).toBe(true);
      expect($transaction).not.toHaveBeenCalled();
    });
  });

  it("rolls back on layout update failure", async () => {
    const mockConfig = {
      id: "sc1",
      tenantId: "t1",
      websiteEnabled: true,
      isPublished: false,
      template: null,
    };

    const mockLayouts = [{ id: "l1" }];

    findUnique.mockResolvedValue(mockConfig);
    findMany.mockResolvedValue(mockLayouts);

    const txError = new Error("Layout update failed");
    $transaction.mockRejectedValue(txError);

    await runWithTenant("t1", async () => {
      await expect(sitesRepo.publishAllDrafts("t1")).rejects.toThrow(
        "Layout update failed",
      );
    });
  });
});
