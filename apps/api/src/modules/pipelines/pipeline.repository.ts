import { randomUUID } from "crypto";
import prisma from "@/config/prisma";
import type { PipelineType } from "@prisma/client";

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
  type?: PipelineType;
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
        type: data.type ?? "GENERAL",
        stages: data.stages,
        isDefault: data.isDefault,
      },
    });
  }

  async findByType(tenantId: string, type: PipelineType) {
    return prisma.pipeline.findFirst({
      where: { tenantId, type, deletedAt: null },
    });
  }

  async count(tenantId: string, search?: string) {
    const where: {
      tenantId: string;
      deletedAt: null;
      name?: { contains: string; mode: "insensitive" };
    } = { tenantId, deletedAt: null };
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }
    return prisma.pipeline.count({ where });
  }

  async findAll(tenantId: string) {
    return prisma.pipeline.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      include: {
        _count: { select: { deals: true } },
      },
    });
  }

  async findAllPaginated(
    tenantId: string,
    skip: number,
    take: number,
    search?: string,
  ) {
    const where: {
      tenantId: string;
      deletedAt: null;
      name?: { contains: string; mode: "insensitive" };
    } = { tenantId, deletedAt: null };
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }
    return prisma.pipeline.findMany({
      where,
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      include: {
        _count: { select: { deals: true } },
      },
      skip,
      take,
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
   * Seed the 3 CRM framework pipelines for a tenant.
   * Returns the created pipelines or skips if they already exist.
   */
  async seedFrameworkPipelines(tenantId: string) {
    const makeStages = (
      names: string[],
      probabilities: number[],
    ): Array<{
      id: string;
      name: string;
      order: number;
      probability: number;
    }> =>
      names.map((name, i) => ({
        id: randomUUID(),
        name,
        order: i + 1,
        probability: probabilities[i] ?? 0,
      }));

    const existing = await prisma.pipeline.findMany({
      where: {
        tenantId,
        type: { in: ["NEW_SALES", "REMARKETING", "REPURCHASE"] },
        deletedAt: null,
      },
      select: { type: true },
    });
    const existingTypes = new Set(existing.map((p) => p.type));

    const results: Array<{ id: string; name: string; type: PipelineType }> = [];

    if (!existingTypes.has("NEW_SALES")) {
      const p = await this.create({
        tenantId,
        name: "New Sales",
        type: "NEW_SALES",
        stages: makeStages(
          [
            "New Lead",
            "Qualifying",
            "Proposal Sent",
            "Negotiating",
            "Closed Won",
            "Closed Lost",
          ],
          [10, 25, 50, 75, 100, 0],
        ),
        isDefault: true,
      });
      results.push({ id: p.id, name: p.name, type: p.type });
    }

    if (!existingTypes.has("REMARKETING")) {
      const p = await this.create({
        tenantId,
        name: "Remarketing",
        type: "REMARKETING",
        stages: makeStages(
          [
            "Post-Purchase Follow-up",
            "Dormant",
            "Re-engaged",
            "Active Interest",
            "Purchase Intent",
          ],
          [20, 5, 30, 50, 80],
        ),
        isDefault: false,
      });
      results.push({ id: p.id, name: p.name, type: p.type });
    }

    if (!existingTypes.has("REPURCHASE")) {
      const p = await this.create({
        tenantId,
        name: "Repurchase",
        type: "REPURCHASE",
        stages: makeStages(
          [
            "Returned",
            "Needs Assessment",
            "Loyalty Offer Made",
            "Negotiating",
            "Closed Won",
            "Closed Lost",
          ],
          [30, 40, 60, 75, 100, 0],
        ),
        isDefault: false,
      });
      results.push({ id: p.id, name: p.name, type: p.type });
    }

    return results;
  }
}

export default new PipelineRepository();
