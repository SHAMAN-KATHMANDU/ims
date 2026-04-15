/**
 * Backfill nav_menus rows for existing tenants.
 *
 * Seeds every tenant whose website feature is enabled with a default
 * "header-primary" NavConfig that matches the hardcoded legacy
 * `buildNavLinks()` layout (Home / Shop / Journal / pages-auto / Contact).
 * Idempotent — tenants that already have a row are skipped so this can be
 * re-run safely after deploy.
 *
 * Usage:
 *   npx tsx apps/api/prisma/scripts/backfill-nav-menus.ts
 *
 * Intentionally NOT wired into `prisma/seed.ts` — the default seed runs in
 * dev and is destructive; this one is an ops script that should only run
 * once in production after the Phase 2 migration.
 */

import { PrismaClient, type Prisma } from "@prisma/client";
import { defaultHeaderNavConfig } from "@repo/shared";

async function main() {
  const prisma = new PrismaClient();
  try {
    const siteConfigs = await prisma.siteConfig.findMany({
      where: { websiteEnabled: true },
      select: { tenantId: true },
    });

    if (siteConfigs.length === 0) {
      // eslint-disable-next-line no-console
      console.log("[backfill-nav-menus] no website-enabled tenants found");
      return;
    }

    const defaultConfig = defaultHeaderNavConfig();
    let created = 0;
    let skipped = 0;

    for (const { tenantId } of siteConfigs) {
      const existing = await prisma.navMenu.findFirst({
        where: { tenantId, slot: "header-primary" },
        select: { id: true },
      });
      if (existing) {
        skipped++;
        continue;
      }
      await prisma.navMenu.create({
        data: {
          tenantId,
          slot: "header-primary",
          items: defaultConfig as unknown as Prisma.InputJsonValue,
        },
      });
      created++;
    }

    // eslint-disable-next-line no-console
    console.log(
      `[backfill-nav-menus] done — created ${created}, skipped ${skipped}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
