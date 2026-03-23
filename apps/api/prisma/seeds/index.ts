import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import * as path from "path";
import { requireEnv } from "./utils";
import { createEmptyContext } from "./types";
import { deleteTenantBySlug } from "./cleanup";
import { seedPlanLimits } from "./01-plan-limits.seed";
import { seedSystemTenant } from "./02-system-tenant.seed";
import { seedTenant } from "./03-tenants.seed";
import { seedUsers } from "./04-users.seed";
import { seedCategories } from "./05-categories.seed";
import { seedVendors } from "./06-vendors.seed";
import { seedLocations } from "./07-locations.seed";
import { seedAttributes } from "./08-attributes.seed";
import { seedDiscountTypes } from "./09-discount-types.seed";
import { seedProducts } from "./10-products.seed";
import { seedInventory } from "./11-inventory.seed";
import { seedMembers } from "./12-members.seed";
import { seedTransfers } from "./13-transfers.seed";
import { seedSales } from "./14-sales.seed";
import { seedPromos } from "./15-promos.seed";
import { seedCrmSettings } from "./16-crm-settings.seed";
import { seedContacts } from "./17-contacts.seed";
import { seedPipelines } from "./18-pipelines.seed";
import { seedLeads } from "./19-leads.seed";
import { seedDeals } from "./20-deals.seed";
import { seedTasks } from "./21-tasks.seed";
import { seedActivities } from "./22-activities.seed";
import { seedNotifications } from "./23-notifications.seed";
import { seedAuditLogs } from "./24-audit-logs.seed";
import { seedErrorReports } from "./25-error-reports.seed";
import { seedMemberTotals } from "./26-member-totals.seed";
import { hashPassword } from "./utils";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const prisma = new PrismaClient();

export type SeedProfile = "all" | "demo" | "test" | "minimal";

const PLATFORM_ADMIN_USERNAME =
  process.env.SEED_PLATFORM_ADMIN_USERNAME ?? "platform";
const SEED_MODE = process.env.SEED_MODE ?? "development";
const isProduction = SEED_MODE === "production";

function envFlagTrue(key: string): boolean {
  return process.env[key] === "true";
}

async function seedMinimalTenant(
  slug: string,
  name: string,
  password: string,
): Promise<void> {
  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    console.log(`  ⏭️ Tenant "${slug}" already exists, skipping.`);
    return;
  }
  const { getSubscriptionPeriod } = await import("./utils");
  const { periodStart: start, periodEnd: end } = getSubscriptionPeriod();

  const tenant = await prisma.tenant.create({
    data: {
      name,
      slug,
      plan: "STARTER",
      isActive: true,
      isTrial: true,
      subscriptionStatus: "TRIAL",
      trialEndsAt: end,
      planExpiresAt: null,
      settings: { timezone: "Asia/Kathmandu", currency: "NPR" },
    },
  });
  await prisma.subscription.create({
    data: {
      tenantId: tenant.id,
      plan: "STARTER",
      billingCycle: "MONTHLY",
      status: "TRIAL",
      currentPeriodStart: start,
      currentPeriodEnd: end,
      trialEndsAt: end,
    },
  });
  const hashedPassword = await hashPassword(password);
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      username: "admin",
      password: hashedPassword,
      role: "superAdmin",
    },
  });
  await prisma.location.create({
    data: {
      tenantId: tenant.id,
      name: "Main Location",
      type: "WAREHOUSE",
      isActive: true,
      isDefaultWarehouse: true,
    },
  });
  await prisma.category.create({
    data: {
      tenantId: tenant.id,
      name: "Uncategorized",
      description: "Default category",
    },
  });
  await prisma.discountType.createMany({
    data: [
      {
        tenantId: tenant.id,
        name: "Member Discount",
        description: "Percentage off for members",
      },
      {
        tenantId: tenant.id,
        name: "Seasonal Flat",
        description: "Flat amount off",
      },
    ],
  });
  console.log(`  ✓ Minimal tenant "${slug}" (${name})`);
}

async function seedMinimalTenantsFromCommaList(
  csv: string | undefined,
  defaultPassword: string,
  label: string,
): Promise<void> {
  const tenantsEnv = csv?.trim();
  if (!tenantsEnv) {
    return;
  }
  console.log(`${label}`);
  for (const part of tenantsEnv.split(",").map((s) => s.trim())) {
    if (!part) continue;
    const segments = part.split(":");
    const slug = segments[0]?.trim();
    const name = segments[1]?.trim() ?? slug;
    const password = segments[2]?.trim() ?? defaultPassword;
    if (slug) await seedMinimalTenant(slug, name, password);
  }
}

async function fullTenantSeed(
  prismaClient: PrismaClient,
  slug: string,
  name: string,
  password: string,
  options?: { deleteFirst?: boolean },
): Promise<void> {
  if (options?.deleteFirst) {
    await deleteTenantBySlug(prismaClient, slug);
    console.log(`  🗑️ Deleted existing "${slug}" for reseed.`);
  }

  const { tenantId, subscriptionId } = await seedTenant(prismaClient, slug, {
    name,
    plan: "PROFESSIONAL",
    isTrial: false,
    subscriptionStatus: "ACTIVE",
  });
  let ctx = createEmptyContext(tenantId, slug, subscriptionId);

  ctx = await seedUsers(prismaClient, ctx, password);
  ctx = await seedCategories(prismaClient, ctx);
  ctx = await seedVendors(prismaClient, ctx);
  ctx = await seedLocations(prismaClient, ctx);
  ctx = await seedAttributes(prismaClient, ctx);
  ctx = await seedDiscountTypes(prismaClient, ctx);
  ctx = await seedProducts(prismaClient, ctx);
  ctx = await seedInventory(prismaClient, ctx);
  ctx = await seedMembers(prismaClient, ctx);
  ctx = await seedTransfers(prismaClient, ctx);
  ctx = await seedSales(prismaClient, ctx, 110);
  ctx = await seedPromos(prismaClient, ctx);
  ctx = await seedCrmSettings(prismaClient, ctx);
  ctx = await seedContacts(prismaClient, ctx);
  ctx = await seedPipelines(prismaClient, ctx);
  ctx = await seedLeads(prismaClient, ctx);
  ctx = await seedDeals(prismaClient, ctx);
  ctx = await seedTasks(prismaClient, ctx);
  ctx = await seedActivities(prismaClient, ctx);
  ctx = await seedNotifications(prismaClient, ctx);
  ctx = await seedAuditLogs(prismaClient, ctx);
  ctx = await seedErrorReports(prismaClient, ctx);
  ctx = await seedMemberTotals(prismaClient, ctx);

  console.log(`  ✓ Full seed complete for "${slug}"`);
}

async function seedPlatformAndPlanLimits(): Promise<void> {
  const platformAdminPassword = requireEnv(
    "SEED_PLATFORM_ADMIN_PASSWORD",
    process.env.SEED_PLATFORM_ADMIN_PASSWORD,
  );

  await seedPlanLimits(prisma);
  await seedSystemTenant(
    prisma,
    PLATFORM_ADMIN_USERNAME,
    platformAdminPassword,
  );
}

/**
 * Deploy `seed.sh` path: flags set by shell only. Ignores SEED_PROFILE.
 * Order: optional minimal CSV → test1/test2 → ruby → demo.
 */
async function runOrchestratedSeed(): Promise<void> {
  const modeLabel = process.env.SEED_MODE ?? "development";
  const profile = process.env.SEED_PROFILE;
  console.log(
    `🌱 Seed (orchestrated, mode: ${modeLabel}${profile ? `, SEED_PROFILE=${profile} ignored` : ""})...\n`,
  );

  await seedPlatformAndPlanLimits();

  const tenantPassword = process.env.SEED_TENANT_PASSWORD ?? "ChangeMe123!";

  await seedMinimalTenantsFromCommaList(
    process.env.SEED_MINIMAL_TENANTS,
    tenantPassword,
    "Seeding minimal tenants from SEED_MINIMAL_TENANTS...",
  );

  if (envFlagTrue("SEED_INCLUDE_TEST")) {
    console.log("Seeding test tenants (test1, test2)...");
    await prisma.$transaction(async (tx) => {
      await fullTenantSeed(
        tx as PrismaClient,
        "test1",
        "Test Tenant 1",
        "test123",
        { deleteFirst: true },
      );
      await fullTenantSeed(
        tx as PrismaClient,
        "test2",
        "Test Tenant 2",
        "test123",
        { deleteFirst: true },
      );
    });
  }

  if (envFlagTrue("SEED_INCLUDE_RUBY")) {
    console.log("Seeding Ruby (minimal)...");
    const rubyPassword = process.env.SEED_RUBY_PASSWORD ?? "admin123";
    await seedMinimalTenant("ruby", "Ruby", rubyPassword);
  }

  if (envFlagTrue("SEED_INCLUDE_DEMO")) {
    console.log("Seeding demo tenant...");
    await prisma.$transaction(async (tx) => {
      await fullTenantSeed(tx as PrismaClient, "demo", "Demo Account", "demo", {
        deleteFirst: true,
      });
    });
  }

  console.log("\n✅ Seed complete.");
}

async function runLegacySeed(): Promise<void> {
  const profile = (process.env.SEED_PROFILE ?? "all") as SeedProfile;
  console.log(`🌱 Seed (profile: ${profile}, mode: ${SEED_MODE})...\n`);

  await seedPlatformAndPlanLimits();

  if (profile === "minimal" || isProduction) {
    const tenantPassword = process.env.SEED_TENANT_PASSWORD ?? "ChangeMe123!";
    const tenantsEnv = process.env.SEED_TENANTS?.trim();
    if (tenantsEnv) {
      await seedMinimalTenantsFromCommaList(
        tenantsEnv,
        tenantPassword,
        "Seeding minimal tenants from SEED_TENANTS...",
      );
    } else {
      console.log("  ⏭️ SEED_TENANTS not set — no tenants created.");
    }
    console.log("\n✅ Seed complete.");
    return;
  }

  if (profile === "test" || profile === "all") {
    console.log("Seeding test tenants (test1, test2)...");
    await prisma.$transaction(async (tx) => {
      await fullTenantSeed(
        tx as PrismaClient,
        "test1",
        "Test Tenant 1",
        "test123",
        { deleteFirst: true },
      );
      await fullTenantSeed(
        tx as PrismaClient,
        "test2",
        "Test Tenant 2",
        "test123",
        { deleteFirst: true },
      );
    });
  }

  if (profile === "all") {
    console.log("Seeding Ruby (minimal)...");
    await seedMinimalTenant("ruby", "Ruby", "admin123");
  }

  if (profile === "demo" || profile === "all") {
    if (process.env.SEED_DEMO === "false") {
      console.log("  ⏭️ SEED_DEMO=false — skipping demo tenant.");
    } else {
      console.log("Seeding demo tenant...");
      await prisma.$transaction(async (tx) => {
        await fullTenantSeed(
          tx as PrismaClient,
          "demo",
          "Demo Account",
          "demo",
          { deleteFirst: true },
        );
      });
    }
  }

  console.log("\n✅ Seed complete.");
}

async function main(): Promise<void> {
  if (process.env.SEED_ORCHESTRATED === "1") {
    await runOrchestratedSeed();
  } else {
    await runLegacySeed();
  }
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
