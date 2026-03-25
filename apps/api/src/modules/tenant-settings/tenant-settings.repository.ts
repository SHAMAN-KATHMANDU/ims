import prisma from "@/config/prisma";

type TenantSettingsPayload = Record<string, unknown> | null;

export class TenantSettingsRepository {
  async getTenantSettings(tenantId: string): Promise<TenantSettingsPayload> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    if (!tenant) return null;
    const settings = tenant.settings as TenantSettingsPayload;
    return settings && typeof settings === "object" ? settings : null;
  }

  async updateTenantSettings(
    tenantId: string,
    settings: Record<string, unknown>,
  ): Promise<void> {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { settings },
    });
  }
}

export default new TenantSettingsRepository();
