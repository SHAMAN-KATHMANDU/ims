/**
 * Public API key repository — uses basePrisma (unscoped) because key lookup
 * happens BEFORE the tenant context is established (the key itself is what
 * tells us which tenant owns the request).
 *
 * For admin CRUD calls (which DO have a JWT-derived tenantId) we still use
 * basePrisma and pass tenantId explicitly in every where clause — mirrors
 * the platform-domains repository pattern.
 */

import type { Prisma, TenantApiKey, TenantDomain } from "@prisma/client";
import { basePrisma } from "@/config/prisma";

export type TenantApiKeyWithDomain = TenantApiKey & {
  tenantDomain: TenantDomain;
};

export interface CreateTenantApiKeyData {
  tenantId: string;
  tenantDomainId: string;
  name: string;
  prefix: string;
  hash: string;
  last4: string;
  rateLimitPerMin?: number;
}

class PublicApiKeysRepository {
  findById(id: string, tenantId: string): Promise<TenantApiKey | null> {
    return basePrisma.tenantApiKey.findFirst({ where: { id, tenantId } });
  }

  /**
   * Lookup by prefix for the auth middleware. Includes the bound TenantDomain
   * so the Origin check can compare against `tenantDomain.hostname` without
   * a second roundtrip.
   */
  findByPrefix(prefix: string): Promise<TenantApiKeyWithDomain | null> {
    return basePrisma.tenantApiKey.findUnique({
      where: { prefix },
      include: { tenantDomain: true },
    });
  }

  findVerifiedDomain(
    tenantDomainId: string,
    tenantId: string,
  ): Promise<TenantDomain | null> {
    return basePrisma.tenantDomain.findFirst({
      where: { id: tenantDomainId, tenantId },
    });
  }

  listByTenant(tenantId: string): Promise<TenantApiKeyWithDomain[]> {
    return basePrisma.tenantApiKey.findMany({
      where: { tenantId },
      include: { tenantDomain: true },
      orderBy: [{ revokedAt: "asc" }, { createdAt: "desc" }],
    });
  }

  create(data: CreateTenantApiKeyData): Promise<TenantApiKeyWithDomain> {
    return basePrisma.tenantApiKey.create({
      data: {
        tenantId: data.tenantId,
        tenantDomainId: data.tenantDomainId,
        name: data.name,
        prefix: data.prefix,
        hash: data.hash,
        last4: data.last4,
        ...(data.rateLimitPerMin !== undefined
          ? { rateLimitPerMin: data.rateLimitPerMin }
          : {}),
      },
      include: { tenantDomain: true },
    });
  }

  update(
    id: string,
    data: Prisma.TenantApiKeyUpdateInput,
  ): Promise<TenantApiKey> {
    return basePrisma.tenantApiKey.update({ where: { id }, data });
  }

  /**
   * Fire-and-forget last-used timestamp update. Caller should NOT await this
   * on the request hot-path — failures are swallowed.
   */
  touchLastUsed(id: string): void {
    basePrisma.tenantApiKey
      .update({ where: { id }, data: { lastUsedAt: new Date() } })
      .catch(() => {
        /* non-fatal */
      });
  }
}

export default new PublicApiKeysRepository();
export { PublicApiKeysRepository };
