import { createError } from "@/middlewares/errorHandler";
import { createPaginationResult } from "@/utils/pagination";
import crmSettingsRepository from "./crm-settings.repository";
import type {
  CreateCrmSourceDto,
  UpdateCrmSourceDto,
  CreateCrmJourneyTypeDto,
  UpdateCrmJourneyTypeDto,
} from "./crm-settings.schema";

const SALES_SOURCE_NAME = "Sales";

export class CrmSettingsService {
  private async ensureDefaultSalesSource(tenantId: string): Promise<void> {
    const existing = await crmSettingsRepository.findSourceByName(
      tenantId,
      SALES_SOURCE_NAME,
    );
    if (!existing) {
      await crmSettingsRepository.createSource(tenantId, {
        name: SALES_SOURCE_NAME,
      });
    }
  }

  private async ensurePipelineJourneyTypes(tenantId: string): Promise<void> {
    const pipelineRepository = (
      await import("../pipelines/pipeline.repository")
    ).default;
    const pipelines = await pipelineRepository.findAll(tenantId);

    for (const pipeline of pipelines) {
      const name = pipeline.name?.trim();
      if (!name) continue;

      const existing = await crmSettingsRepository.findJourneyTypeByName(
        tenantId,
        name,
      );
      if (!existing) {
        await crmSettingsRepository.createJourneyType(tenantId, { name });
      }
    }
  }

  // ── Sources ──────────────────────────────────────────────────────────────

  async getAllSources(
    tenantId: string,
    query?: { page?: number; limit?: number; search?: string },
  ) {
    await this.ensureDefaultSalesSource(tenantId);
    const page = query?.page;
    const limit = query?.limit;
    const search = query?.search;
    const usePagination =
      page != null && limit != null && page > 0 && limit > 0;
    if (!usePagination) {
      const sources = await crmSettingsRepository.findAllSources(tenantId);
      return { sources };
    }
    const [sources, totalItems] = await Promise.all([
      crmSettingsRepository.findAllSourcesPaginated(
        tenantId,
        (page - 1) * limit,
        limit,
        search,
      ),
      crmSettingsRepository.countSources(tenantId, search),
    ]);
    const result = createPaginationResult(sources, totalItems, page, limit);
    return { sources: result.data, pagination: result.pagination };
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

  async getAllJourneyTypes(
    tenantId: string,
    query?: { page?: number; limit?: number; search?: string },
  ) {
    await this.ensurePipelineJourneyTypes(tenantId);
    const page = query?.page;
    const limit = query?.limit;
    const search = query?.search;
    const usePagination =
      page != null && limit != null && page > 0 && limit > 0;
    if (!usePagination) {
      const journeyTypes =
        await crmSettingsRepository.findAllJourneyTypes(tenantId);
      return { journeyTypes };
    }
    const [journeyTypes, totalItems] = await Promise.all([
      crmSettingsRepository.findAllJourneyTypesPaginated(
        tenantId,
        (page - 1) * limit,
        limit,
        search,
      ),
      crmSettingsRepository.countJourneyTypes(tenantId, search),
    ]);
    const result = createPaginationResult(
      journeyTypes,
      totalItems,
      page,
      limit,
    );
    return { journeyTypes: result.data, pagination: result.pagination };
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
