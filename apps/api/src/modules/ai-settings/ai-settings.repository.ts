import { basePrisma } from "@/config/prisma";
import type { Prisma } from "@prisma/client";

export interface TenantAiSettings {
  systemPrompt: string | null;
}

function extractAiSettings(settings: unknown): TenantAiSettings {
  if (
    settings &&
    typeof settings === "object" &&
    "aiSystemPrompt" in settings
  ) {
    const raw = (settings as { aiSystemPrompt?: unknown }).aiSystemPrompt;
    return { systemPrompt: typeof raw === "string" ? raw : null };
  }
  return { systemPrompt: null };
}

export class AiSettingsRepository {
  async getByTenantId(tenantId: string): Promise<TenantAiSettings> {
    const tenant = await basePrisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { settings: true },
    });
    return extractAiSettings(tenant.settings);
  }

  async update(
    tenantId: string,
    systemPrompt: string | null,
  ): Promise<TenantAiSettings> {
    const tenant = await basePrisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { settings: true },
    });

    const existingSettings =
      tenant.settings && typeof tenant.settings === "object"
        ? (tenant.settings as Record<string, unknown>)
        : {};

    const updatedSettings: Prisma.InputJsonValue = {
      ...existingSettings,
      aiSystemPrompt: systemPrompt,
    };

    await basePrisma.tenant.update({
      where: { id: tenantId },
      data: { settings: updatedSettings },
    });

    return { systemPrompt };
  }
}

export default new AiSettingsRepository();
