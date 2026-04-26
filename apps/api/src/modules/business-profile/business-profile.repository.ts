/**
 * Business Profile Repository — sole prisma accessor for this module.
 */

import prisma from "@/config/prisma";
import type { TenantBusinessProfile } from "@prisma/client";

export type UpdateBusinessProfileData = Partial<
  Omit<TenantBusinessProfile, "id" | "tenantId" | "createdAt" | "updatedAt">
>;

export class BusinessProfileRepository {
  /**
   * Return the business profile for a tenant, auto-creating a minimal row
   * (upsert-on-miss) so callers never get null.
   */
  async getByTenant(tenantId: string): Promise<TenantBusinessProfile> {
    return prisma.tenantBusinessProfile.upsert({
      where: { tenantId },
      update: {},
      create: { tenantId, defaultCurrency: "NPR" },
    });
  }

  /**
   * Partial update. Only the supplied keys are changed.
   */
  async update(
    tenantId: string,
    data: UpdateBusinessProfileData,
  ): Promise<TenantBusinessProfile> {
    return prisma.tenantBusinessProfile.upsert({
      where: { tenantId },
      update: data,
      create: { tenantId, defaultCurrency: "NPR", ...data },
    });
  }
}

export default new BusinessProfileRepository();
