/**
 * Tenant domain repository — uses basePrisma (unscoped) since domain management
 * is a platform-admin concern and lookups happen before tenant resolution.
 */

import { basePrisma } from "@/config/prisma";
import type { Prisma, TenantDomain, TenantDomainApp } from "@prisma/client";

export interface CreateTenantDomainData {
  tenantId: string;
  hostname: string;
  appType: TenantDomainApp;
  isPrimary: boolean;
  verifyToken: string;
}

class PlatformDomainsRepository {
  findById(id: string): Promise<TenantDomain | null> {
    return basePrisma.tenantDomain.findUnique({ where: { id } });
  }

  findByHostname(hostname: string): Promise<TenantDomain | null> {
    return basePrisma.tenantDomain.findUnique({ where: { hostname } });
  }

  listByTenant(
    tenantId: string,
    appType?: TenantDomainApp,
  ): Promise<TenantDomain[]> {
    return basePrisma.tenantDomain.findMany({
      where: { tenantId, ...(appType ? { appType } : {}) },
      orderBy: [
        { appType: "asc" },
        { isPrimary: "desc" },
        { createdAt: "asc" },
      ],
    });
  }

  create(data: CreateTenantDomainData): Promise<TenantDomain> {
    return basePrisma.tenantDomain.create({ data });
  }

  update(
    id: string,
    data: Prisma.TenantDomainUpdateInput,
  ): Promise<TenantDomain> {
    return basePrisma.tenantDomain.update({ where: { id }, data });
  }

  delete(id: string): Promise<TenantDomain> {
    return basePrisma.tenantDomain.delete({ where: { id } });
  }

  /**
   * Clear isPrimary from every other domain of the same (tenant, appType) pair.
   * Used when promoting a domain to primary to enforce the "one primary per
   * (tenant, appType)" invariant.
   */
  async clearOtherPrimaries(
    tenantId: string,
    appType: TenantDomainApp,
    exceptId: string,
  ): Promise<void> {
    await basePrisma.tenantDomain.updateMany({
      where: { tenantId, appType, isPrimary: true, NOT: { id: exceptId } },
      data: { isPrimary: false },
    });
  }

  tenantExists(tenantId: string): Promise<{ id: string } | null> {
    return basePrisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });
  }
}

export default new PlatformDomainsRepository();
