/**
 * Essential seeds — platform-level data the API needs on every fresh DB:
 *   1. PlanLimit + PricingPlan
 *   2. SiteTemplate catalog
 *   3. System tenant + platform admin user
 *   4. SiteConfig backfill for existing tenants
 *   5. TenantPage scope-page backfill for existing tenants
 *
 * All modules are idempotent (upsert / exists-check), so re-running on every
 * container boot is safe. Driven by `prisma/seed-essential.ts` (entrypoint
 * compiled to `prisma/seed-essential.js`, called from docker-entrypoint.sh).
 *
 * Required env (read by runEssentialSeeds):
 *   SEED_PLATFORM_ADMIN_PASSWORD  — bootstraps the platform admin user
 * Optional env:
 *   SEED_PLATFORM_ADMIN_USERNAME  — defaults to "platform"
 */
import type { PrismaClient } from "@prisma/client";
import { requireEnv } from "../utils";
import { seedPlanLimits } from "./01-plan-limits.seed";
import { seedSiteTemplates } from "./02-site-templates.seed";
import { seedSystemTenant } from "./03-system-tenant.seed";
import { seedBackfillSiteConfigs } from "./04-backfill-site-configs.seed";
import { seedBackfillScopePages } from "./05-backfill-scope-pages.seed";

export async function runEssentialSeeds(prisma: PrismaClient): Promise<void> {
  const platformAdminUsername =
    process.env.SEED_PLATFORM_ADMIN_USERNAME ?? "platform";
  const platformAdminPassword = requireEnv(
    "SEED_PLATFORM_ADMIN_PASSWORD",
    process.env.SEED_PLATFORM_ADMIN_PASSWORD,
  );

  await seedPlanLimits(prisma);
  await seedSiteTemplates(prisma);
  await seedSystemTenant(prisma, platformAdminUsername, platformAdminPassword);
  await seedBackfillSiteConfigs(prisma);
  await seedBackfillScopePages(prisma);
}
