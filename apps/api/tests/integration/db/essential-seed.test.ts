/**
 * Unit tests for the essential-seed orchestrator at
 * prisma/seeds/essential/index.ts. Mocks the per-module seed functions so we
 * verify the orchestrator's contract (each module invoked once, env required,
 * password threaded through to the system-tenant seed) without needing a
 * real database connection.
 *
 * Per-module idempotency is guaranteed by `prisma.upsert` calls inside each
 * seed and isn't asserted here.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const seedPlanLimits = vi.fn();
const seedSiteTemplates = vi.fn();
const seedSystemTenant = vi.fn();
const seedBackfillSiteConfigs = vi.fn();
const seedBackfillScopePages = vi.fn();

vi.mock("../../../prisma/seeds/essential/01-plan-limits.seed", () => ({
  seedPlanLimits: (...args: unknown[]) => seedPlanLimits(...args),
}));
vi.mock("../../../prisma/seeds/essential/02-site-templates.seed", () => ({
  seedSiteTemplates: (...args: unknown[]) => seedSiteTemplates(...args),
}));
vi.mock("../../../prisma/seeds/essential/03-system-tenant.seed", () => ({
  seedSystemTenant: (...args: unknown[]) => seedSystemTenant(...args),
}));
vi.mock(
  "../../../prisma/seeds/essential/04-backfill-site-configs.seed",
  () => ({
    seedBackfillSiteConfigs: (...args: unknown[]) =>
      seedBackfillSiteConfigs(...args),
  }),
);
vi.mock("../../../prisma/seeds/essential/05-backfill-scope-pages.seed", () => ({
  seedBackfillScopePages: (...args: unknown[]) =>
    seedBackfillScopePages(...args),
}));

import { runEssentialSeeds } from "../../../prisma/seeds/essential/index";

const fakePrisma = {} as unknown as Parameters<typeof runEssentialSeeds>[0];

describe("runEssentialSeeds", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    seedPlanLimits.mockResolvedValue(undefined);
    seedSiteTemplates.mockResolvedValue(undefined);
    seedSystemTenant.mockResolvedValue({
      systemTenantId: "t1",
      platformAdminUserId: "u1",
    });
    seedBackfillSiteConfigs.mockResolvedValue(undefined);
    seedBackfillScopePages.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("invokes every essential seed module exactly once", async () => {
    process.env.SEED_PLATFORM_ADMIN_PASSWORD = "test-pw";
    await runEssentialSeeds(fakePrisma);
    expect(seedPlanLimits).toHaveBeenCalledTimes(1);
    expect(seedSiteTemplates).toHaveBeenCalledTimes(1);
    expect(seedSystemTenant).toHaveBeenCalledTimes(1);
    expect(seedBackfillSiteConfigs).toHaveBeenCalledTimes(1);
    expect(seedBackfillScopePages).toHaveBeenCalledTimes(1);
  });

  it("threads the platform admin password from env into seedSystemTenant", async () => {
    process.env.SEED_PLATFORM_ADMIN_USERNAME = "admin";
    process.env.SEED_PLATFORM_ADMIN_PASSWORD = "sekret";
    await runEssentialSeeds(fakePrisma);
    expect(seedSystemTenant).toHaveBeenCalledWith(
      fakePrisma,
      "admin",
      "sekret",
    );
  });

  it("defaults the platform admin username to 'platform'", async () => {
    delete process.env.SEED_PLATFORM_ADMIN_USERNAME;
    process.env.SEED_PLATFORM_ADMIN_PASSWORD = "sekret";
    await runEssentialSeeds(fakePrisma);
    expect(seedSystemTenant).toHaveBeenCalledWith(
      fakePrisma,
      "platform",
      "sekret",
    );
  });

  it("throws when SEED_PLATFORM_ADMIN_PASSWORD is unset", async () => {
    delete process.env.SEED_PLATFORM_ADMIN_PASSWORD;
    await expect(runEssentialSeeds(fakePrisma)).rejects.toThrow(
      /SEED_PLATFORM_ADMIN_PASSWORD/,
    );
    expect(seedPlanLimits).not.toHaveBeenCalled();
  });

  it("re-running is a structural no-op (same number of calls each run)", async () => {
    process.env.SEED_PLATFORM_ADMIN_PASSWORD = "test-pw";
    await runEssentialSeeds(fakePrisma);
    await runEssentialSeeds(fakePrisma);
    expect(seedPlanLimits).toHaveBeenCalledTimes(2);
    expect(seedSystemTenant).toHaveBeenCalledTimes(2);
    // Per-call idempotency comes from `prisma.upsert` inside each module —
    // covered by Prisma's contract, not asserted here.
  });
});
