import { createError } from "@/middlewares/errorHandler";
import crmSettingsRepository from "./crm-settings.repository";
import type {
  CreateCrmSourceDto,
  UpdateCrmSourceDto,
  CreateCrmJourneyTypeDto,
  UpdateCrmJourneyTypeDto,
} from "./crm-settings.schema";

export class CrmSettingsService {
  // ── Sources ──────────────────────────────────────────────────────────────

  async getAllSources(tenantId: string) {
    return crmSettingsRepository.findAllSources(tenantId);
  }

  async createSource(tenantId: string, data: CreateCrmSourceDto) {
    const existing = await crmSettingsRepository.findSourceByName(
      tenantId,
      data.name.trim(),
    );
    if (existing)
      throw createError("A source with this name already exists", 409);
    return crmSettingsRepository.createSource(tenantId, data);
  }

  async updateSource(tenantId: string, id: string, data: UpdateCrmSourceDto) {
    const existing = await crmSettingsRepository.findSourceById(tenantId, id);
    if (!existing) throw createError("Source not found", 404);
    const nameConflict = await crmSettingsRepository.findSourceByName(
      tenantId,
      data.name.trim(),
    );
    if (nameConflict && nameConflict.id !== id) {
      throw createError("A source with this name already exists", 409);
    }
    return crmSettingsRepository.updateSource(id, data);
  }

  async deleteSource(tenantId: string, id: string) {
    const existing = await crmSettingsRepository.findSourceById(tenantId, id);
    if (!existing) throw createError("Source not found", 404);
    await crmSettingsRepository.deleteSource(id);
  }

  // ── Journey Types ─────────────────────────────────────────────────────────

  async getAllJourneyTypes(tenantId: string) {
    return crmSettingsRepository.findAllJourneyTypes(tenantId);
  }

  async createJourneyType(tenantId: string, data: CreateCrmJourneyTypeDto) {
    const existing = await crmSettingsRepository.findJourneyTypeByName(
      tenantId,
      data.name.trim(),
    );
    if (existing)
      throw createError("A journey type with this name already exists", 409);
    return crmSettingsRepository.createJourneyType(tenantId, data);
  }

  async updateJourneyType(
    tenantId: string,
    id: string,
    data: UpdateCrmJourneyTypeDto,
  ) {
    const existing = await crmSettingsRepository.findJourneyTypeById(
      tenantId,
      id,
    );
    if (!existing) throw createError("Journey type not found", 404);
    const nameConflict = await crmSettingsRepository.findJourneyTypeByName(
      tenantId,
      data.name.trim(),
    );
    if (nameConflict && nameConflict.id !== id) {
      throw createError("A journey type with this name already exists", 409);
    }
    return crmSettingsRepository.updateJourneyType(id, data);
  }

  async deleteJourneyType(tenantId: string, id: string) {
    const existing = await crmSettingsRepository.findJourneyTypeById(
      tenantId,
      id,
    );
    if (!existing) throw createError("Journey type not found", 404);
    await crmSettingsRepository.deleteJourneyType(id);
  }
}

export default new CrmSettingsService();
