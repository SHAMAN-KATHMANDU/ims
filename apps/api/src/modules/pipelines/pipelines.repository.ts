/**
 * Pipelines repository - database access for pipelines module.
 */

import prisma from "@/config/prisma";
import type { Prisma } from "@prisma/client";

const pipelineInclude = {
  pipelineStages: { orderBy: { order: "asc" as const } },
  _count: { select: { deals: true } },
} as const;

export const pipelinesRepository = {
  findMany(tenantId: string) {
    return prisma.pipeline.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      include: pipelineInclude,
    });
  },

  findById(id: string, tenantId: string) {
    return prisma.pipeline.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: pipelineInclude,
    });
  },

  create(data: Prisma.PipelineCreateInput) {
    return prisma.pipeline.create({
      data,
      include: pipelineInclude,
    });
  },

  update(id: string, data: Prisma.PipelineUpdateInput) {
    return prisma.pipeline.update({
      where: { id },
      data,
      include: pipelineInclude,
    });
  },

  unsetDefaultForTenant(tenantId: string) {
    return prisma.pipeline.updateMany({
      where: { tenantId },
      data: { isDefault: false },
    });
  },

  unsetDefaultForTenantExcept(tenantId: string, excludeId: string) {
    return prisma.pipeline.updateMany({
      where: { tenantId, id: { not: excludeId } },
      data: { isDefault: false },
    });
  },

  deleteStagesByPipelineId(pipelineId: string) {
    return prisma.pipelineStage.deleteMany({
      where: { pipelineId },
    });
  },

  createStages(
    pipelineId: string,
    stages: { name: string; order: number; probability: number }[],
  ) {
    return prisma.pipelineStage.createMany({
      data: stages.map((s) => ({
        pipelineId,
        name: s.name,
        order: s.order,
        probability: s.probability,
      })),
    });
  },

  countDealsInPipeline(tenantId: string, pipelineId: string) {
    return prisma.deal.count({
      where: { tenantId, pipelineId },
    });
  },

  softDelete(id: string) {
    return prisma.pipeline.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};
