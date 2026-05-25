import type { PrismaClient } from "@prisma/client";

/**
 * Backfill SiteConfig rows for all tenants that don't have one yet.
 * Idempotent: skips tenants that already have a SiteConfig.
 */
export async function seedBackfillSiteConfigs(
  prisma: PrismaClient,
): Promise<void> {
  // Find all tenants without a SiteConfig
  const tenantsWithoutConfig = await prisma.tenant.findMany({
    where: {
      siteConfig: null,
    },
    select: { id: true, slug: true },
  });

  let count = 0;
  for (const tenant of tenantsWithoutConfig) {
    await prisma.siteConfig.create({
      data: {
        tenantId: tenant.id,
        websiteEnabled: true,
      },
    });
    count++;
  }

  if (count > 0) {
    console.log(`  ✓ Backfilled SiteConfig for ${count} tenants`);
  } else {
    console.log(`  ⏭️ All tenants already have SiteConfig`);
  }
}
