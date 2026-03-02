import prisma from "@/config/prisma";

const DEFAULT_STAGES = [
  { id: "1", name: "Qualification", order: 1, probability: 10 },
  { id: "2", name: "Proposal", order: 2, probability: 30 },
  { id: "3", name: "Negotiation", order: 3, probability: 60 },
  { id: "4", name: "Closed Won", order: 4, probability: 100 },
  { id: "5", name: "Closed Lost", order: 5, probability: 0 },
];

export interface CreatePipelineData {
  tenantId: string;
  name: string;
  stages: Array<{
    id: string;
    name: string;
    order: number;
    probability: number;
  }>;
  isDefault: boolean;
}

export interface UpdatePipelineData {
  name?: string;
  stages?: Array<{
    id: string;
    name: string;
    order: number;
    probability: number;
  }>;
  isDefault?: boolean;
}

export class PipelineRepository {
  async create(data: CreatePipelineData) {
    return prisma.pipeline.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        stages: data.stages,
        isDefault: data.isDefault,
      },
    });
  }

  async findAll(tenantId: string) {
    return prisma.pipeline.findMany({
      where: { tenantId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      include: {
        _count: { select: { deals: true } },
      },
    });
  }

  async findById(tenantId: string, id: string) {
    return prisma.pipeline.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { deals: true } } },
    });
  }

  async update(id: string, data: UpdatePipelineData) {
    return prisma.pipeline.update({
      where: { id },
      data,
    });
  }

  async clearDefaultForTenant(tenantId: string) {
    return prisma.pipeline.updateMany({
      where: { tenantId },
      data: { isDefault: false },
    });
  }

  async clearDefaultForTenantExcept(tenantId: string, exceptId: string) {
    return prisma.pipeline.updateMany({
      where: { tenantId, id: { not: exceptId } },
      data: { isDefault: false },
    });
  }

  async countDealsInPipeline(pipelineId: string, tenantId: string) {
    return prisma.deal.count({
      where: { pipelineId, tenantId },
    });
  }

  async softDelete(id: string) {
    return prisma.pipeline.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  getDefaultStages() {
    return DEFAULT_STAGES;
  }
}

export default new PipelineRepository();
