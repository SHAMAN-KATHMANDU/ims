import aiSettingsRepository, {
  AiSettingsRepository,
  type TenantAiSettings,
} from "./ai-settings.repository";

export class AiSettingsService {
  constructor(private repo: AiSettingsRepository) {}

  async get(tenantId: string): Promise<TenantAiSettings> {
    return this.repo.getByTenantId(tenantId);
  }

  async update(
    tenantId: string,
    systemPrompt: string | null,
  ): Promise<TenantAiSettings> {
    const trimmed = systemPrompt?.trim() || null;
    return this.repo.update(tenantId, trimmed);
  }
}

export default new AiSettingsService(aiSettingsRepository);
