import { basePrisma } from "@/config/prisma";
import type {
  CreateWorkflowDto,
  CreateWorkflowRuleDto,
} from "./workflow.schema";
import { CRM_WORKFLOW_TEMPLATES } from "@repo/shared";
import type { PipelineType, Prisma } from "@prisma/client";

const workflowListInclude = {
  pipeline: { select: { id: true, name: true } },
  rules: { orderBy: { ruleOrder: "asc" as const } },
};

export class WorkflowRepository {
  async replaceFrameworkDefaults(
    tenantId: string,
    pipelines: Array<{ id: string; type: PipelineType }>,
  ) {
    const pipelineIdByType = new Map(pipelines.map((p) => [p.type, p.id]));
    const pipelineIds = pipelines.map((pipeline) => pipeline.id);
    if (pipelineIds.length === 0) return [];

    return basePrisma.$transaction(async (tx) => {
      await tx.workflowRule.deleteMany({
        where: {
          workflow: {
            tenantId,
            pipelineId: { in: pipelineIds },
          },
        },
      });
      await tx.pipelineWorkflow.deleteMany({
        where: {
          tenantId,
          pipelineId: { in: pipelineIds },
        },
      });

      for (const template of CRM_WORKFLOW_TEMPLATES) {
        const pipelineId = pipelineIdByType.get(template.pipelineType);
        if (!pipelineId) continue;

        const workflow = await tx.pipelineWorkflow.create({
          data: {
            tenantId,
            pipelineId,
            name: template.name,
            isActive: template.isActive ?? true,
          },
        });

        if (template.rules.length > 0) {
          await tx.workflowRule.createMany({
            data: template.rules.map((rule, index) => ({
              workflowId: workflow.id,
              trigger: rule.trigger,
              triggerStageId: rule.triggerStageId ?? null,
              action: rule.action,
              actionConfig: rule.actionConfig as Prisma.InputJsonValue,
              ruleOrder: rule.ruleOrder ?? index,
            })),
          });
        }
      }

      return tx.pipelineWorkflow.findMany({
        where: {
          tenantId,
          pipelineId: { in: pipelineIds },
        },
        include: workflowListInclude,
        orderBy: { createdAt: "asc" },
      });
    });
  }

  async countByTenant(
    tenantId: string,
    filters?: { search?: string; isActive?: boolean; pipelineId?: string },
  ): Promise<number> {
    const where: {
      tenantId: string;
      name?: { contains: string; mode: "insensitive" };
      isActive?: boolean;
      pipelineId?: string;
    } = { tenantId };
    if (filters?.search) {
      where.name = { contains: filters.search, mode: "insensitive" };
    }
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters?.pipelineId) {
      where.pipelineId = filters.pipelineId;
    }
    return basePrisma.pipelineWorkflow.count({ where });
  }

  async findAllByTenant(tenantId: string) {
    return basePrisma.pipelineWorkflow.findMany({
      where: { tenantId },
      include: workflowListInclude,
      orderBy: { createdAt: "asc" },
    });
  }

  async findAllByTenantPaginated(
    tenantId: string,
    skip: number,
    take: number,
    filters?: { search?: string; isActive?: boolean; pipelineId?: string },
  ) {
    const where: {
      tenantId: string;
      name?: { contains: string; mode: "insensitive" };
      isActive?: boolean;
      pipelineId?: string;
    } = { tenantId };
    if (filters?.search) {
      where.name = { contains: filters.search, mode: "insensitive" };
    }
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters?.pipelineId) {
      where.pipelineId = filters.pipelineId;
    }
    return basePrisma.pipelineWorkflow.findMany({
      where,
      include: workflowListInclude,
      orderBy: { createdAt: "asc" },
      skip,
      take,
    });
  }

  async findByPipeline(tenantId: string, pipelineId: string) {
    return basePrisma.pipelineWorkflow.findMany({
      where: { tenantId, pipelineId },
      include: { rules: { orderBy: { ruleOrder: "asc" } } },
      orderBy: { createdAt: "asc" },
    });
  }

  async findActiveRulesByPipeline(tenantId: string, pipelineId: string) {
    return basePrisma.workflowRule.findMany({
      where: {
        workflow: {
          tenantId,
          pipelineId,
          isActive: true,
        },
      },
      include: {
        workflow: { include: { pipeline: { select: { stages: true } } } },
      },
      orderBy: [{ workflowId: "asc" }, { ruleOrder: "asc" }],
    });
  }

  async findById(tenantId: string, id: string) {
    return basePrisma.pipelineWorkflow.findFirst({
      where: { id, tenantId },
      include: {
        pipeline: true,
        rules: { orderBy: { ruleOrder: "asc" } },
      },
    });
  }

  async create(tenantId: string, data: CreateWorkflowDto) {
    const { rules: rulesData, ...rest } = data;
    return basePrisma.$transaction(async (tx) => {
      const workflow = await tx.pipelineWorkflow.create({
        data: {
          tenantId,
          pipelineId: rest.pipelineId,
          name: rest.name.trim(),
          isActive: rest.isActive ?? true,
        },
      });
      if (rulesData && rulesData.length > 0) {
        await tx.workflowRule.createMany({
          data: rulesData.map((r, i) => ({
            workflowId: workflow.id,
            trigger: r.trigger,
            triggerStageId: r.triggerStageId ?? null,
            action: r.action,
            actionConfig: (r.actionConfig ?? {}) as object,
            ruleOrder: r.ruleOrder ?? i,
          })),
        });
      }
      const result = await tx.pipelineWorkflow.findFirst({
        where: { id: workflow.id, tenantId },
        include: {
          pipeline: true,
          rules: { orderBy: { ruleOrder: "asc" } },
        },
      });
      if (!result) throw new Error("Workflow not found after create");
      return result;
    });
  }

  async update(
    id: string,
    tenantId: string,
    data: {
      name?: string;
      isActive?: boolean;
      rules?: CreateWorkflowRuleDto[];
    },
  ) {
    const updateData: { name?: string; isActive?: boolean } = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    const hasRules = data.rules !== undefined;

    if (hasRules) {
      return basePrisma.$transaction(async (tx) => {
        if (Object.keys(updateData).length > 0) {
          const updated = await tx.pipelineWorkflow.updateMany({
            where: { id, tenantId },
            data: updateData,
          });
          if (updated.count === 0) throw new Error("Workflow not found");
        }
        await tx.workflowRule.deleteMany({ where: { workflowId: id } });
        if (data.rules!.length > 0) {
          await tx.workflowRule.createMany({
            data: data.rules!.map((r, i) => ({
              workflowId: id,
              trigger: r.trigger,
              triggerStageId: r.triggerStageId ?? null,
              action: r.action,
              actionConfig: (r.actionConfig ?? {}) as object,
              ruleOrder: r.ruleOrder ?? i,
            })),
          });
        }
        const result = await tx.pipelineWorkflow.findFirst({
          where: { id, tenantId },
          include: {
            pipeline: true,
            rules: { orderBy: { ruleOrder: "asc" } },
          },
        });
        if (!result) throw new Error("Workflow not found after update");
        return result;
      });
    }

    const result = await basePrisma.pipelineWorkflow.updateMany({
      where: { id, tenantId },
      data: updateData,
    });
    if (result.count === 0) throw new Error("Workflow not found");
    const found = await this.findById(tenantId, id);
    if (!found) throw new Error("Workflow not found after update");
    return found;
  }

  async delete(id: string, tenantId: string) {
    const result = await basePrisma.pipelineWorkflow.deleteMany({
      where: { id, tenantId },
    });
    if (result.count === 0) throw new Error("Workflow not found");
  }
}

export default new WorkflowRepository();
