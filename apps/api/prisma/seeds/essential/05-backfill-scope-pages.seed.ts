/**
 * Phase 5 backfill — create TenantPage scope rows for all existing tenants.
 *
 * When a template is applied, the sites service upserts TenantPage rows
 * (kind="scope") for each scope in BLUEPRINT_SCOPES, so they appear in the
 * Pages list alongside user-created custom pages. For existing tenants that
 * already have SiteLayout rows but no corresponding TenantPage scope rows,
 * this seed backfills them.
 *
 * Idempotent: upserts on (tenantId, scope) where kind='scope'.
 */

import { PrismaClient, type Prisma } from "@prisma/client";

export async function seedBackfillScopePages(
  prisma: PrismaClient,
): Promise<void> {
  const BLUEPRINT_SCOPES = [
    "header",
    "footer",
    "home",
    "products-index",
    "product-detail",
    "offers",
    "cart",
    "blog-index",
    "blog-post",
    "contact",
    "page",
    "404",
  ] as const;

  const scopeNames: Record<string, string> = {
    header: "Header",
    footer: "Footer",
    home: "Home",
    "products-index": "Products",
    "product-detail": "Product detail",
    offers: "Offers",
    cart: "Cart",
    "blog-index": "Blog",
    "blog-post": "Blog post",
    contact: "Contact",
    page: "Page",
    "404": "Not found",
  };

  // Find all tenants that have at least one SiteLayout
  const tenantsWithLayouts = await prisma.siteLayout
    .findMany({
      distinct: ["tenantId"],
      select: { tenantId: true },
    })
    .then((rows) => rows.map((r) => r.tenantId));

  if (tenantsWithLayouts.length === 0) {
    console.log("  ⏭️ No tenants with SiteLayout found, skipping backfill.");
    return;
  }

  console.log(
    `  Backfilling TenantPage scope rows for ${tenantsWithLayouts.length} tenant(s)...`,
  );

  for (const tenantId of tenantsWithLayouts) {
    for (const scope of BLUEPRINT_SCOPES) {
      // Check if scope page already exists
      const existing = await prisma.tenantPage.findFirst({
        where: { tenantId, kind: "scope", scope },
      });

      if (existing) {
        // Already has scope page, skip
        continue;
      }

      // Upsert scope page
      await prisma.tenantPage.upsert({
        where: {
          tenantId_slug: {
            tenantId,
            slug: `__scope_${scope}__`,
          },
        },
        create: {
          tenantId,
          slug: scope, // Use scope name as slug
          title: scopeNames[scope] || scope,
          bodyMarkdown: "",
          body: [],
          kind: "scope",
          scope,
          isBuiltInScope: true,
          showInNav: true,
          navOrder: 0,
          isPublished: true,
        },
        update: {}, // No-op on collision (shouldn't happen, but safe)
      });
    }
  }

  console.log(`  ✓ Backfilled TenantPage scope rows.`);
}
