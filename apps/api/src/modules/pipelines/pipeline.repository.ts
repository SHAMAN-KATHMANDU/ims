import { randomUUID } from "crypto";
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

  async softDelete(
    id: string,
    data: { deletedBy: string; deleteReason?: string | null },
  ) {
    return prisma.pipeline.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: data.deletedBy,
        deleteReason: data.deleteReason ?? undefined,
      },
    });
  }

  getDefaultStages() {
    return DEFAULT_STAGES;
  }

  /**
   * Seed 3 default pipelines for a new tenant.
   * Called after tenant creation.
   */
  async seedDefaultPipelines(tenantId: string) {
    const makeStages = (
      names: string[],
      probabilities: number[] = [],
    ): Array<{
      id: string;
      name: string;
      order: number;
      probability: number;
    }> =>
      names.map((name, i) => ({
        id: randomUUID(),
        name,
        order: i,
        probability: probabilities[i] ?? 0,
      }));

    const salesStages = makeStages(
      [
        "New Lead",
        "Contacted",
        "Qualified",
        "Proposal Sent",
        "Negotiation",
        "Closed Won",
        "Closed Lost",
      ],
      [0, 5, 15, 40, 70, 100, 0],
    );
    const remarketingStages = makeStages([
      "Identified",
      "Re-engaged",
      "Interested",
      "Offer Sent",
      "Converted",
      "Not Interested",
    ]);
    const repurchaseStages = makeStages([
      "Past Customer",
      "Follow-up Sent",
      "Considering",
      "Repeat Purchase",
      "Churned",
    ]);

    await this.create({
      tenantId,
      name: "Sales Pipeline",
      stages: salesStages,
      isDefault: true,
    });
    await this.create({
      tenantId,
      name: "Remarketing Pipeline",
      stages: remarketingStages,
      isDefault: false,
    });
    await this.create({
      tenantId,
      name: "Repurchase Pipeline",
      stages: repurchaseStages,
      isDefault: false,
    });
  }
}

export default new PipelineRepository();
