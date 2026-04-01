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
const JOURNEY_TYPE_MANAGED_BY_PIPELINES_ERROR =
  "Journey types are derived from the contact's active deal pipeline and stage and cannot be edited manually.";

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
    const page = query?.page;
    const limit = query?.limit;
    const search = query?.search;
    const contactRepository = (await import("../contacts/contact.repository"))
      .default;
    const journeyTypes = await contactRepository.findDerivedJourneyTypes(
      tenantId,
      search,
    );
    const usePagination =
      page != null && limit != null && page > 0 && limit > 0;
    if (!usePagination) {
      return { journeyTypes };
    }
    const result = createPaginationResult(
      journeyTypes.slice((page - 1) * limit, (page - 1) * limit + limit),
      journeyTypes.length,
      page,
      limit,
    );
    return { journeyTypes: result.data, pagination: result.pagination };
  }

  async createJourneyType(tenantId: string, data: CreateCrmJourneyTypeDto) {
    void tenantId;
    void data;
    throw createError(JOURNEY_TYPE_MANAGED_BY_PIPELINES_ERROR, 403);
  }

  async updateJourneyType(
    tenantId: string,
    id: string,
    data: UpdateCrmJourneyTypeDto,
  ) {
    void tenantId;
    void id;
    void data;
    throw createError(JOURNEY_TYPE_MANAGED_BY_PIPELINES_ERROR, 403);
  }

  async deleteJourneyType(tenantId: string, id: string) {
    void tenantId;
    void id;
    throw createError(JOURNEY_TYPE_MANAGED_BY_PIPELINES_ERROR, 403);
  }
}

export default new CrmSettingsService();
