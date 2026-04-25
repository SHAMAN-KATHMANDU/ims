/**
 * Internal repository — cross-tenant lookups for the /internal/* endpoints.
 * Uses basePrisma because these run before any tenant context is established.
 */

import { basePrisma } from "@/config/prisma";
import type { SiteConfig, Tenant, TenantDomain } from "@prisma/client";

export type DomainWithContext = TenantDomain & {
  tenant: Tenant;
  tenant_site_config: SiteConfig | null;
};

export class InternalRepository {
  /**
   * Look up a hostname with everything the internal endpoints need in a
   * single query: the domain row, its tenant, and the tenant's SiteConfig
   * (to check `websiteEnabled` + `isPublished`).
   */
  async findDomainWithContext(
    hostname: string,
  ): Promise<DomainWithContext | null> {
    const domain = await basePrisma.tenantDomain.findUnique({
      where: { hostname },
      include: {
        tenant: {
          include: { siteConfig: true },
        },
      },
    });
    if (!domain) return null;
    return {
      ...domain,
      tenant: domain.tenant,
      tenant_site_config: domain.tenant.siteConfig ?? null,
    };
  }
}

export default new InternalRepository();
