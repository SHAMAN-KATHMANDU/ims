/**
 * Business Profile Service — thin orchestration layer.
 */

import type { TenantBusinessProfile } from "@prisma/client";
import repository, {
  BusinessProfileRepository,
  UpdateBusinessProfileData,
} from "./business-profile.repository";

export class BusinessProfileService {
  constructor(private repo: BusinessProfileRepository) {}

  async getForTenant(tenantId: string): Promise<TenantBusinessProfile> {
    return this.repo.getByTenant(tenantId);
  }

  async updateForTenant(
    tenantId: string,
    data: UpdateBusinessProfileData,
  ): Promise<TenantBusinessProfile> {
    return this.repo.update(tenantId, data);
  }
}

export default new BusinessProfileService(repository);
