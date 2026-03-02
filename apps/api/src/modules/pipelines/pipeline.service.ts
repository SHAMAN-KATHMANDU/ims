import { createError } from "@/middlewares/errorHandler";
import pipelineRepository from "./pipeline.repository";
import type { CreatePipelineDto, UpdatePipelineDto } from "./pipeline.schema";

export class PipelineService {
  async create(tenantId: string, data: CreatePipelineDto) {
    const stages: Array<{
      id: string;
      name: string;
      order: number;
      probability: number;
    }> =
      Array.isArray(data.stages) && data.stages.length > 0
        ? (data.stages as Array<{
            id: string;
            name: string;
            order: number;
            probability: number;
          }>)
        : pipelineRepository.getDefaultStages();

    if (data.isDefault) {
      await pipelineRepository.clearDefaultForTenant(tenantId);
    }

    return pipelineRepository.create({
      tenantId,
      name: data.name,
      stages,
      isDefault: !!data.isDefault,
    });
  }

  async getAll(tenantId: string) {
    return pipelineRepository.findAll(tenantId);
  }

  async getById(tenantId: string, id: string) {
    const pipeline = await pipelineRepository.findById(tenantId, id);
    if (!pipeline) throw createError("Pipeline not found", 404);
    return pipeline;
  }

  async update(tenantId: string, id: string, data: UpdatePipelineDto) {
    const existing = await pipelineRepository.findById(tenantId, id);
    if (!existing) throw createError("Pipeline not found", 404);

    if (data.isDefault) {
      await pipelineRepository.clearDefaultForTenantExcept(tenantId, id);
    }

    const updateData: Parameters<typeof pipelineRepository.update>[1] = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.stages !== undefined && Array.isArray(data.stages)) {
      updateData.stages = data.stages as Array<{
        id: string;
        name: string;
        order: number;
        probability: number;
      }>;
    }
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

    return pipelineRepository.update(id, updateData);
  }

  async delete(tenantId: string, id: string) {
    const existing = await pipelineRepository.findById(tenantId, id);
    if (!existing) throw createError("Pipeline not found", 404);

    const dealCount = await pipelineRepository.countDealsInPipeline(
      id,
      tenantId,
    );
    if (dealCount > 0) {
      throw createError(
        "Cannot delete pipeline with existing deals. Move or remove deals first.",
        400,
      );
    }

    await pipelineRepository.softDelete(id);
  }
}

export default new PipelineService();
