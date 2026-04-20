/**
 * Focused tests for the per-request memoization in SitesRepository.findConfig.
 * Verifies:
 *  - inside a `runWithTenant` context, duplicate calls collapse to one DB hit
 *  - outside a tenant context the memo is inactive (tests / scripts)
 *  - updateConfig invalidates the memo so subsequent reads see the write
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { findUnique, update } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({
  default: { siteConfig: { findUnique, update } },
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
