/**
 * Pipelines service - business logic for pipelines module.
 */

import type { Prisma } from "@prisma/client";
import { NotFoundError, DomainError } from "@/shared/errors";
import { pipelinesRepository } from "./pipelines.repository";

const DEFAULT_STAGES = [
  { name: "Qualification", order: 1, probability: 10 },
  { name: "Proposal", order: 2, probability: 30 },
  { name: "Negotiation", order: 3, probability: 60 },
  { name: "Closed Won", order: 4, probability: 100 },
  { name: "Closed Lost", order: 5, probability: 0 },
];

type StageInput = { name?: string; order?: number; probability?: number };

function normalizeStages(
  stages: StageInput[],
  fallbacks: typeof DEFAULT_STAGES,
) {
  return stages.map((s, i) => ({
    name: (s.name ?? "").trim() || (fallbacks[i]?.name ?? `Stage ${i + 1}`),
    order: typeof s.order === "number" ? s.order : i + 1,
    probability: typeof s.probability === "number" ? s.probability : 0,
  }));
}

function mapPipelineToResponse(
  pipeline: Awaited<ReturnType<typeof pipelinesRepository.findById>>,
) {
  if (!pipeline) return null;
  const stages = pipeline.pipelineStages.map((s) => ({
    id: s.id,
    name: s.name,
    order: s.order,
    probability: s.probability,
  }));
  return { ...pipeline, stages };
}

export interface CreatePipelineInput {
  name: string;
  stages?: StageInput[];
  isDefault?: boolean;
}

export interface UpdatePipelineInput {
  name?: string;
  stages?: StageInput[];
  isDefault?: boolean;
}

export const pipelinesService = {
  async create(tenantId: string, input: CreatePipelineInput) {
    const stagesInput =
      Array.isArray(input.stages) && input.stages.length > 0
        ? normalizeStages(input.stages, DEFAULT_STAGES)
        : DEFAULT_STAGES;

    if (input.isDefault) {
      await pipelinesRepository.unsetDefaultForTenant(tenantId);
    }

    const pipeline = await pipelinesRepository.create({
      tenant: { connect: { id: tenantId } },
      name: input.name,
      isDefault: !!input.isDefault,
      pipelineStages: {
        create: stagesInput.map((s) => ({
          name: s.name,
          order: s.order,
          probability: s.probability,
        })),
      },
    });

    return mapPipelineToResponse(pipeline);
  },

  async getAll(tenantId: string) {
    const pipelines = await pipelinesRepository.findMany(tenantId);
    return pipelines.map((p) => mapPipelineToResponse(p)!);
  },

  async getById(id: string, tenantId: string) {
    const pipeline = await pipelinesRepository.findById(id, tenantId);
    if (!pipeline) throw new NotFoundError("Pipeline not found");
    return mapPipelineToResponse(pipeline)!;
  },

  async update(id: string, tenantId: string, input: UpdatePipelineInput) {
    const existing = await pipelinesRepository.findById(id, tenantId);
    if (!existing) throw new NotFoundError("Pipeline not found");

    if (input.isDefault) {
      await pipelinesRepository.unsetDefaultForTenantExcept(tenantId, id);
    }

    const updateData: Prisma.PipelineUpdateInput = {};
    if (input.name !== undefined) updateData.name = input.name || existing.name;
    if (input.isDefault !== undefined) updateData.isDefault = !!input.isDefault;

    if (input.stages !== undefined && Array.isArray(input.stages)) {
      await pipelinesRepository.deleteStagesByPipelineId(id);
      const normalized = normalizeStages(input.stages, DEFAULT_STAGES);
      if (normalized.length > 0) {
        await pipelinesRepository.createStages(id, normalized);
      }
    }

    const pipeline = await pipelinesRepository.update(id, updateData);
    return mapPipelineToResponse(pipeline)!;
  },

  async delete(id: string, tenantId: string) {
    const existing = await pipelinesRepository.findById(id, tenantId);
    if (!existing) throw new NotFoundError("Pipeline not found");

    const dealCount = await pipelinesRepository.countDealsInPipeline(
      tenantId,
      id,
    );
    if (dealCount > 0) {
      throw new DomainError(
        400,
        "Cannot delete pipeline with existing deals. Move or remove deals first.",
      );
    }

    await pipelinesRepository.softDelete(id);
  },
};
