import { createError } from "@/middlewares/errorHandler";
import dealRepository from "./deal.repository";
import type {
  CreateDealDto,
  UpdateDealDto,
  UpdateDealStageDto,
} from "./deal.schema";

export class DealService {
  async create(tenantId: string, data: CreateDealDto, userId: string) {
    const pipeline = await dealRepository.findDefaultPipeline(
      tenantId,
      data.pipelineId,
    );
    if (!pipeline) {
      throw createError(
        "No pipeline found. Create a default pipeline first.",
        400,
      );
    }

    const stages = pipeline.stages as Array<{ id: string; name: string }>;
    const firstStage =
      Array.isArray(stages) && stages.length > 0
        ? stages[0].name
        : "Qualification";
    const stage = data.stage || firstStage;

    return dealRepository.create(tenantId, data, userId, stage, pipeline.id);
  }

  async getAll(tenantId: string, query: Record<string, unknown>) {
    return dealRepository.findAll(tenantId, query);
  }

  async getByPipeline(tenantId: string, pipelineId?: string) {
    const result = await dealRepository.findKanban(tenantId, pipelineId);
    if (!result) throw createError("No pipeline found", 404);
    return result;
  }

  async getById(tenantId: string, id: string) {
    const deal = await dealRepository.findById(tenantId, id);
    if (!deal) throw createError("Deal not found", 404);
    return deal;
  }

  async update(tenantId: string, id: string, data: UpdateDealDto) {
    const existing = await dealRepository.findById(tenantId, id);
    if (!existing) throw createError("Deal not found", 404);

    const deal = await dealRepository.update(id, data, existing.name);

    if (data.stage && data.stage !== existing.stage && existing.assignedToId) {
      await dealRepository.createNotification(
        existing.assignedToId,
        deal.id,
        deal.name,
        data.stage,
      );
    }

    return deal;
  }

  async updateStage(tenantId: string, id: string, data: UpdateDealStageDto) {
    const existing = await dealRepository.findById(tenantId, id);
    if (!existing) throw createError("Deal not found", 404);

    const deal = await dealRepository.updateStage(id, data.stage);

    if (existing.assignedToId) {
      await dealRepository.createNotification(
        existing.assignedToId,
        deal.id,
        deal.name,
        data.stage,
      );
    }

    return deal;
  }

  async delete(tenantId: string, id: string) {
    const existing = await dealRepository.findById(tenantId, id);
    if (!existing) throw createError("Deal not found", 404);
    await dealRepository.softDelete(id);
  }
}

export default new DealService();
