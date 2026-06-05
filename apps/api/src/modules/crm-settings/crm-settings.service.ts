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

  /**
   * Journey types are now a first-class editable lookup (CrmJourneyType table),
   * but pipelines still auto-produce "Pipeline(Stage)" labels for the contacts
   * filter. We MERGE the two — user-managed entries (with real ids) plus the
   * pipeline-derived labels — deduped by name (case-insensitive), so both the
   * settings UI and the contacts filter keep working.
   */
  async getAllJourneyTypes(
    tenantId: string,
    query?: { page?: number; limit?: number; search?: string },
  ) {
    const page = query?.page;
    const limit = query?.limit;
    const search = query?.search;

    const [stored, contactRepository] = await Promise.all([
      crmSettingsRepository.findAllJourneyTypes(tenantId),
      import("../contacts/contact.repository").then((m) => m.default),
    ]);
    const derived = await contactRepository.findDerivedJourneyTypes(
      tenantId,
      search,
    );

    const normalizedSearch = search?.trim().toLowerCase();
    const byName = new Map<
      string,
      { id: string; name: string; createdAt: string }
    >();
    for (const jt of stored) {
      if (
        normalizedSearch &&
        !jt.name.toLowerCase().includes(normalizedSearch)
      ) {
        continue;
      }
      byName.set(jt.name.toLowerCase(), {
        id: jt.id,
        name: jt.name,
        createdAt:
          jt.createdAt instanceof Date
            ? jt.createdAt.toISOString()
            : jt.createdAt,
      });
    }
    for (const jt of derived) {
      if (!byName.has(jt.name.toLowerCase())) {
        byName.set(jt.name.toLowerCase(), jt);
      }
    }
    const journeyTypes = Array.from(byName.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
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

  async syncJourneyTypeToPipelineRename(
    tenantId: string,
    oldName: string,
    newName: string,
  ): Promise<void> {
    const normalizedOldName = oldName.trim();
    const normalizedNewName = newName.trim();
    if (!normalizedOldName || !normalizedNewName) return;
    if (normalizedOldName === normalizedNewName) {
      await crmSettingsRepository.upsertJourneyTypeByName(
        tenantId,
        normalizedNewName,
      );
      return;
    }

    const existingJourneyType =
      await crmSettingsRepository.findJourneyTypeByName(
        tenantId,
        normalizedOldName,
      );
    if (existingJourneyType) {
      const targetJourneyType =
        await crmSettingsRepository.findJourneyTypeByName(
          tenantId,
          normalizedNewName,
        );

      if (targetJourneyType) {
        await crmSettingsRepository.deleteJourneyType(existingJourneyType.id);
      } else {
        await crmSettingsRepository.renameJourneyTypeByName(
          tenantId,
          normalizedOldName,
          normalizedNewName,
        );
      }
    }

    const contactRepository = (await import("../contacts/contact.repository"))
      .default;
    await contactRepository.renameJourneyTypeForPipeline(
      tenantId,
      normalizedOldName,
      normalizedNewName,
    );
  }

  async syncJourneyTypeToPipelineDelete(
    tenantId: string,
    pipelineName: string,
  ): Promise<void> {
    const normalizedPipelineName = pipelineName.trim();
    if (!normalizedPipelineName) return;

    const existingJourneyType =
      await crmSettingsRepository.findJourneyTypeByName(
        tenantId,
        normalizedPipelineName,
      );
    if (existingJourneyType) {
      await crmSettingsRepository.deleteJourneyType(existingJourneyType.id);
    }

    const contactRepository = (await import("../contacts/contact.repository"))
      .default;
    await contactRepository.clearJourneyTypeForPipeline(
      tenantId,
      normalizedPipelineName,
    );
  }
}

export default new CrmSettingsService();
