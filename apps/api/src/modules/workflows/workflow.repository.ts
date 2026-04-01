import { basePrisma } from "@/config/prisma";
import type {
  CreateWorkflowDto,
  CreateWorkflowRuleDto,
} from "./workflow.schema";
import {
  CRM_WORKFLOW_TEMPLATES,
  getCrmWorkflowTemplateByKey,
  type CrmWorkflowTemplate,
} from "@repo/shared";
import type {
  PipelineType,
  Prisma,
  WorkflowAction,
  WorkflowOrigin,
  WorkflowRunStatus,
  WorkflowTrigger,
} from "@prisma/client";

const workflowListInclude = {
  pipeline: { select: { id: true, name: true } },
  rules: { orderBy: { ruleOrder: "asc" as const } },
};

export interface InstallWorkflowTemplateOptions {
  pipelineId?: string;
  overwriteExisting?: boolean;
  activate?: boolean;
  origin?: WorkflowOrigin;
}

export interface CreateWorkflowRunData {
  tenantId: string;
  workflowId: string;
  ruleId?: string | null;
  trigger: WorkflowTrigger;
  action?: WorkflowAction;
  status: WorkflowRunStatus;
  entityId: string;
  entityType?: string;
  dedupeKey?: string;
  attempt?: number;
  metadata?: Prisma.InputJsonValue;
  errorMessage?: string;
}

export class WorkflowRepository {
  private buildTemplateWorkflowData(
    tenantId: string,
    pipelineId: string,
    template: CrmWorkflowTemplate,
    options?: InstallWorkflowTemplateOptions,
  ): Prisma.PipelineWorkflowUncheckedCreateInput {
    return {
      tenantId,
      pipelineId,
      name: template.name,
      description: template.description,
      isActive: options?.activate ?? template.isActive ?? true,
      templateKey: template.templateKey,
      templateVersion: template.version,
      origin: options?.origin ?? "TEMPLATE",
      version: template.version,
      publishedAt: new Date(),
    };
  }

  private buildTemplateWorkflowUpdateData(
    template: CrmWorkflowTemplate,
    pipelineId: string,
    options?: InstallWorkflowTemplateOptions,
  ): Prisma.PipelineWorkflowUncheckedUpdateInput {
    return {
      pipelineId,
      name: template.name,
      description: template.description,
      isActive: options?.activate ?? template.isActive ?? true,
      templateKey: template.templateKey,
      templateVersion: template.version,
      origin: options?.origin ?? "TEMPLATE",
      version: { increment: 1 },
      publishedAt: new Date(),
    };
  }

  private buildTemplateRules(
    workflowId: string,
    template: CrmWorkflowTemplate,
  ): Array<Prisma.WorkflowRuleCreateManyInput> {
    return template.rules.map((rule, index) => ({
      workflowId,
      trigger: rule.trigger,
      triggerStageId: rule.triggerStageId ?? null,
      action: rule.action,
      actionConfig: rule.actionConfig as Prisma.InputJsonValue,
      ruleOrder: rule.ruleOrder ?? index,
    }));
  }

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
          data: this.buildTemplateWorkflowData(tenantId, pipelineId, template, {
            origin: "SYSTEM",
            activate: template.isActive ?? true,
          }),
        });

        if (template.rules.length > 0) {
          await tx.workflowRule.createMany({
            data: this.buildTemplateRules(workflow.id, template),
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
          description: null,
          isActive: rest.isActive ?? true,
          origin: "CUSTOM",
          publishedAt: new Date(),
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
      description?: string | null;
      isActive?: boolean;
      rules?: CreateWorkflowRuleDto[];
    },
  ) {
    const updateData: Prisma.PipelineWorkflowUncheckedUpdateManyInput = {
      version: { increment: 1 },
      publishedAt: new Date(),
    };
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined)
      updateData.description = data.description;
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

  async findTemplateCatalog(tenantId: string) {
    const installedWorkflows = await basePrisma.pipelineWorkflow.findMany({
      where: {
        tenantId,
        templateKey: {
          in: CRM_WORKFLOW_TEMPLATES.map((template) => template.templateKey),
        },
      },
      select: {
        id: true,
        name: true,
        pipelineId: true,
        templateKey: true,
        templateVersion: true,
        isActive: true,
        createdAt: true,
        pipeline: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    const pipelinesByType = await basePrisma.pipeline.findMany({
      where: {
        tenantId,
        type: { in: ["NEW_SALES", "REMARKETING", "REPURCHASE"] },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        type: true,
      },
    });

    return CRM_WORKFLOW_TEMPLATES.map((template) => {
      const installed = installedWorkflows.find(
        (workflow) => workflow.templateKey === template.templateKey,
      );
      const availablePipelines = pipelinesByType.filter(
        (pipeline) => pipeline.type === template.pipelineType,
      );

      return {
        templateKey: template.templateKey,
        name: template.name,
        description: template.description,
        category: template.category,
        difficulty: template.difficulty,
        recommended: template.recommended,
        supportedObjects: template.supportedObjects,
        pipelineType: template.pipelineType,
        version: template.version,
        isInstalled: Boolean(installed),
        installedWorkflowId: installed?.id ?? null,
        installedWorkflowName: installed?.name ?? null,
        installedPipelineId: installed?.pipeline.id ?? null,
        installedPipelineName: installed?.pipeline.name ?? null,
        installedAt: installed?.createdAt ?? null,
        isActive: installed?.isActive ?? false,
        availablePipelines,
        rulesPreview: template.rules.map((rule) => ({
          trigger: rule.trigger,
          triggerStageId: rule.triggerStageId ?? null,
          action: rule.action,
          ruleOrder: rule.ruleOrder ?? null,
        })),
      };
    });
  }

  async installTemplate(
    tenantId: string,
    templateKey: string,
    options?: InstallWorkflowTemplateOptions,
  ) {
    const template = getCrmWorkflowTemplateByKey(templateKey);
    if (!template) {
      throw new Error(`Unknown workflow template: ${templateKey}`);
    }

    return basePrisma.$transaction(async (tx) => {
      const pipeline =
        options?.pipelineId != null
          ? await tx.pipeline.findFirst({
              where: {
                id: options.pipelineId,
                tenantId,
                deletedAt: null,
              },
              select: {
                id: true,
                name: true,
                type: true,
              },
            })
          : await tx.pipeline.findFirst({
              where: {
                tenantId,
                type: template.pipelineType,
                deletedAt: null,
              },
              select: {
                id: true,
                name: true,
                type: true,
              },
            });

      if (!pipeline) {
        throw new Error(
          `No ${template.pipelineType} pipeline found for template ${templateKey}`,
        );
      }

      const existing = await tx.pipelineWorkflow.findFirst({
        where: {
          tenantId,
          pipelineId: pipeline.id,
          templateKey,
        },
      });

      let workflowId = existing?.id;

      if (existing && options?.overwriteExisting !== true) {
        return tx.pipelineWorkflow.findFirst({
          where: { id: existing.id, tenantId },
          include: {
            pipeline: true,
            rules: { orderBy: { ruleOrder: "asc" } },
          },
        });
      }

      if (existing) {
        await tx.workflowRule.deleteMany({
          where: { workflowId: existing.id },
        });
        await tx.pipelineWorkflow.update({
          where: { id: existing.id },
          data: this.buildTemplateWorkflowUpdateData(
            template,
            pipeline.id,
            options,
          ),
        });
        workflowId = existing.id;
      } else {
        const workflow = await tx.pipelineWorkflow.create({
          data: this.buildTemplateWorkflowData(
            tenantId,
            pipeline.id,
            template,
            options,
          ),
        });
        workflowId = workflow.id;
      }

      if (!workflowId) {
        throw new Error("Template workflow installation failed");
      }

      if (template.rules.length > 0) {
        await tx.workflowRule.createMany({
          data: this.buildTemplateRules(workflowId, template),
        });
      }

      return tx.pipelineWorkflow.findFirst({
        where: { id: workflowId, tenantId },
        include: {
          pipeline: true,
          rules: { orderBy: { ruleOrder: "asc" } },
        },
      });
    });
  }

  async findRecentRuns(tenantId: string, workflowId: string, limit: number) {
    return basePrisma.workflowRun.findMany({
      where: {
        tenantId,
        workflowId,
      },
      orderBy: { startedAt: "desc" },
      take: limit,
    });
  }

  async createWorkflowRun(data: CreateWorkflowRunData) {
    return basePrisma.workflowRun.create({
      data: {
        tenantId: data.tenantId,
        workflowId: data.workflowId,
        ruleId: data.ruleId ?? null,
        trigger: data.trigger,
        action: data.action,
        status: data.status,
        entityId: data.entityId,
        entityType: data.entityType ?? "DEAL",
        dedupeKey: data.dedupeKey,
        attempt: data.attempt ?? 1,
        metadata: data.metadata,
        errorMessage: data.errorMessage,
      },
    });
  }

  async markWorkflowRunSucceeded(runId: string, workflowId: string) {
    return basePrisma.$transaction(async (tx) => {
      await tx.workflowRun.update({
        where: { id: runId },
        data: {
          status: "SUCCEEDED",
          completedAt: new Date(),
        },
      });
      await tx.pipelineWorkflow.update({
        where: { id: workflowId },
        data: {
          lastRunAt: new Date(),
          runCount: { increment: 1 },
        },
      });
    });
  }

  async markWorkflowRunFailed(
    runId: string,
    workflowId: string,
    errorMessage: string,
  ) {
    return basePrisma.$transaction(async (tx) => {
      await tx.workflowRun.update({
        where: { id: runId },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          errorMessage,
        },
      });
      await tx.pipelineWorkflow.update({
        where: { id: workflowId },
        data: {
          lastRunAt: new Date(),
          lastErrorAt: new Date(),
          runCount: { increment: 1 },
          failureCount: { increment: 1 },
        },
      });
    });
  }

  async markWorkflowRunSkipped(runId: string, workflowId: string) {
    return basePrisma.$transaction(async (tx) => {
      await tx.workflowRun.update({
        where: { id: runId },
        data: {
          status: "SKIPPED",
          completedAt: new Date(),
        },
      });
      await tx.pipelineWorkflow.update({
        where: { id: workflowId },
        data: {
          lastRunAt: new Date(),
          runCount: { increment: 1 },
        },
      });
    });
  }

  async delete(id: string, tenantId: string) {
    const result = await basePrisma.pipelineWorkflow.deleteMany({
      where: { id, tenantId },
    });
    if (result.count === 0) throw new Error("Workflow not found");
  }
}

export default new WorkflowRepository();
