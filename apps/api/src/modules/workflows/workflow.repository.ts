import { basePrisma } from "@/config/prisma";
import { logger } from "@/config/logger";
import { createError } from "@/middlewares/errorHandler";
import type {
  CreateWorkflowDto,
  CreateWorkflowRuleDto,
} from "./workflow.schema";
import {
  CRM_WORKFLOW_TEMPLATES,
  getCrmWorkflowTemplateByKey,
  parseWorkflowActionConfig,
  type CrmWorkflowTemplate,
  type WorkflowActionConfigValue,
  type WorkflowPipelineType,
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

type WorkflowWithDetails = Prisma.PipelineWorkflowGetPayload<{
  include: {
    pipeline: true;
    rules: {
      orderBy: {
        ruleOrder: "asc";
      };
    };
  };
}>;

interface InstallablePipeline {
  id: string;
  name: string;
  type: PipelineType;
  stages: unknown;
}

export interface InstallWorkflowTemplateOptions {
  pipelineId?: string;
  overwriteExisting?: boolean;
  activate?: boolean;
  origin?: WorkflowOrigin;
}

export interface InstallWorkflowTemplateResult {
  outcome: "installed" | "reused" | "overwritten";
  workflow: WorkflowWithDetails;
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
  private getNormalizedStageEntries(
    stages: unknown,
  ): Array<{ id: string; name: string }> {
    if (!Array.isArray(stages)) return [];

    return stages.flatMap((stage) => {
      if (!stage || typeof stage !== "object") return [];
      const candidate = stage as { id?: unknown; name?: unknown };
      if (
        typeof candidate.name !== "string" ||
        candidate.name.trim().length === 0
      ) {
        return [];
      }

      return [
        {
          id:
            typeof candidate.id === "string" && candidate.id.trim().length > 0
              ? candidate.id
              : candidate.name,
          name: candidate.name,
        },
      ];
    });
  }

  private resolveStageReference(
    stages: unknown,
    stageReference: string,
    contextMessage: string,
  ): { id: string; name: string } {
    const normalizedReference = stageReference.trim();
    const stage = this.getNormalizedStageEntries(stages).find(
      (candidate) =>
        candidate.id === normalizedReference ||
        candidate.name.toLowerCase() === normalizedReference.toLowerCase(),
    );

    if (!stage) {
      throw createError(contextMessage, 400, "workflow_stage_mapping_invalid");
    }

    return stage;
  }

  private async findPipelineById(
    tx: Prisma.TransactionClient,
    tenantId: string,
    pipelineId: string,
  ): Promise<InstallablePipeline | null> {
    return tx.pipeline.findFirst({
      where: {
        id: pipelineId,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        type: true,
        stages: true,
      },
    });
  }

  private async findPipelineByType(
    tx: Prisma.TransactionClient,
    tenantId: string,
    pipelineType: WorkflowPipelineType,
  ): Promise<InstallablePipeline | null> {
    return tx.pipeline.findFirst({
      where: {
        tenantId,
        type: pipelineType,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        type: true,
        stages: true,
      },
    });
  }

  private async resolvePipelineReference(
    tx: Prisma.TransactionClient,
    tenantId: string,
    reference:
      | {
          pipelineId?: string;
          pipelineType?: WorkflowPipelineType;
        }
      | undefined,
    contextMessage: string,
  ): Promise<InstallablePipeline | null> {
    if (!reference) return null;

    if (reference.pipelineId) {
      const pipeline = await this.findPipelineById(
        tx,
        tenantId,
        reference.pipelineId,
      );
      if (!pipeline) {
        throw createError(
          contextMessage,
          400,
          "workflow_target_pipeline_missing",
        );
      }
      return pipeline;
    }

    if (reference.pipelineType) {
      const pipeline = await this.findPipelineByType(
        tx,
        tenantId,
        reference.pipelineType,
      );
      if (!pipeline) {
        throw createError(
          contextMessage,
          400,
          "workflow_target_pipeline_missing",
        );
      }
      return pipeline;
    }

    return null;
  }

  private async resolveTemplateRuleConfig(
    tx: Prisma.TransactionClient,
    tenantId: string,
    template: CrmWorkflowTemplate,
    installPipeline: InstallablePipeline,
    action: WorkflowAction,
    rawConfig: WorkflowActionConfigValue,
  ): Promise<WorkflowActionConfigValue> {
    switch (action) {
      case "CREATE_DEAL": {
        const config = parseWorkflowActionConfig(action, rawConfig);
        const targetPipeline = await this.resolvePipelineReference(
          tx,
          tenantId,
          {
            pipelineId: config.pipelineId,
            pipelineType: config.pipelineType,
          },
          `Template "${template.name}" references a missing target pipeline for CREATE_DEAL.`,
        );
        if (!targetPipeline) return config;

        const resolvedStage = config.stageId
          ? this.resolveStageReference(
              targetPipeline.stages,
              config.stageId,
              `Template "${template.name}" references an unknown CREATE_DEAL stage.`,
            )
          : config.stageName
            ? this.resolveStageReference(
                targetPipeline.stages,
                config.stageName,
                `Template "${template.name}" references an unknown CREATE_DEAL stage.`,
              )
            : null;

        return {
          ...config,
          pipelineId: targetPipeline.id,
          pipelineType: undefined,
          stageId: resolvedStage?.id,
          stageName: resolvedStage?.name,
        };
      }

      case "CREATE_TASK": {
        const config = parseWorkflowActionConfig(action, rawConfig);
        if (config.taskDealLink?.mode !== "OPEN_DEAL_IN_PIPELINE") {
          return config;
        }

        const targetPipeline = await this.resolvePipelineReference(
          tx,
          tenantId,
          {
            pipelineId: config.taskDealLink.targetPipelineId,
            pipelineType: config.taskDealLink.targetPipelineType,
          },
          `Template "${template.name}" references a missing task-link pipeline.`,
        );
        if (!targetPipeline) return config;

        const resolvedStageName = config.taskDealLink.stageName
          ? this.resolveStageReference(
              targetPipeline.stages,
              config.taskDealLink.stageName,
              `Template "${template.name}" references an unknown task-link stage.`,
            ).name
          : undefined;

        return {
          ...config,
          taskDealLink: {
            mode: "OPEN_DEAL_IN_PIPELINE",
            targetPipelineId: targetPipeline.id,
            targetPipelineType: undefined,
            stageName: resolvedStageName,
          },
        };
      }

      case "MOVE_STAGE": {
        const config = parseWorkflowActionConfig(action, rawConfig);
        const targetPipeline = config.targetPipelineId
          ? await this.resolvePipelineReference(
              tx,
              tenantId,
              { pipelineId: config.targetPipelineId },
              `Template "${template.name}" references a missing MOVE_STAGE pipeline.`,
            )
          : installPipeline;

        return {
          ...config,
          targetPipelineId: config.targetPipelineId ?? undefined,
          targetStageId: this.resolveStageReference(
            targetPipeline?.stages ?? installPipeline.stages,
            config.targetStageId,
            `Template "${template.name}" references an unknown MOVE_STAGE stage.`,
          ).id,
        };
      }

      default:
        return parseWorkflowActionConfig(action, rawConfig);
    }
  }

  private async resolveTemplateRules(
    tx: Prisma.TransactionClient,
    tenantId: string,
    pipeline: InstallablePipeline,
    template: CrmWorkflowTemplate,
  ): Promise<CreateWorkflowRuleDto[]> {
    return Promise.all(
      template.rules.map(async (rule, index) => {
        const triggerStageId = rule.triggerStageId
          ? this.resolveStageReference(
              pipeline.stages,
              rule.triggerStageId,
              `Template "${template.name}" references an unknown trigger stage "${rule.triggerStageId}".`,
            ).id
          : null;

        return {
          trigger: rule.trigger,
          triggerStageId,
          action: rule.action,
          actionConfig: await this.resolveTemplateRuleConfig(
            tx,
            tenantId,
            template,
            pipeline,
            rule.action,
            rule.actionConfig,
          ),
          ruleOrder: rule.ruleOrder ?? index,
        };
      }),
    );
  }

  private assertCompatibleInstallPipeline(
    template: CrmWorkflowTemplate,
    pipeline: InstallablePipeline,
  ): void {
    if (pipeline.type !== template.pipelineType) {
      throw createError(
        `Template "${template.name}" requires a ${template.pipelineType} pipeline.`,
        400,
        "workflow_template_pipeline_type_mismatch",
      );
    }
  }

  private async findWorkflowWithDetails(
    tx: Prisma.TransactionClient,
    tenantId: string,
    workflowId: string,
  ): Promise<WorkflowWithDetails> {
    const workflow = await tx.pipelineWorkflow.findFirst({
      where: { id: workflowId, tenantId },
      include: {
        pipeline: true,
        rules: { orderBy: { ruleOrder: "asc" } },
      },
    });

    if (!workflow) {
      throw createError("Workflow not found", 404, "workflow_not_found");
    }

    return workflow;
  }

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
    rules: readonly CreateWorkflowRuleDto[],
  ): Array<Prisma.WorkflowRuleCreateManyInput> {
    return rules.map((rule, index) => ({
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
            origin: "SYSTEM",
          },
        },
      });
      await tx.pipelineWorkflow.deleteMany({
        where: {
          tenantId,
          pipelineId: { in: pipelineIds },
          origin: "SYSTEM",
        },
      });

      for (const template of CRM_WORKFLOW_TEMPLATES) {
        const pipelineId = pipelineIdByType.get(template.pipelineType);
        if (!pipelineId) continue;

        const pipeline = await this.findPipelineById(tx, tenantId, pipelineId);
        if (!pipeline) continue;

        const resolvedRules = await this.resolveTemplateRules(
          tx,
          tenantId,
          pipeline,
          template,
        );

        const workflow = await tx.pipelineWorkflow.create({
          data: this.buildTemplateWorkflowData(tenantId, pipelineId, template, {
            origin: "SYSTEM",
            activate: template.isActive ?? true,
          }),
        });

        if (resolvedRules.length > 0) {
          await tx.workflowRule.createMany({
            data: this.buildTemplateRules(workflow.id, resolvedRules),
          });
        }
      }

      logger.request("Workflow framework defaults reseeded", undefined, {
        tenantId,
        pipelineIds,
      });

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

    logger.request("Workflow template catalog loaded", undefined, {
      tenantId,
      installedTemplateCount: installedWorkflows.length,
      availablePipelineCount: pipelinesByType.length,
    });

    return CRM_WORKFLOW_TEMPLATES.map((template) => {
      const templateInstallations = installedWorkflows.filter(
        (workflow) => workflow.templateKey === template.templateKey,
      );
      const installed = templateInstallations[0];
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
        isOutdated:
          Boolean(installed) &&
          (installed?.templateVersion ?? 0) < template.version,
        installedWorkflowId: installed?.id ?? null,
        installedWorkflowName: installed?.name ?? null,
        installedPipelineId: installed?.pipeline.id ?? null,
        installedPipelineName: installed?.pipeline.name ?? null,
        installedAt: installed?.createdAt ?? null,
        isActive: installed?.isActive ?? false,
        installedCount: templateInstallations.length,
        installState: installed
          ? (installed.templateVersion ?? 0) < template.version
            ? "OUTDATED"
            : "INSTALLED"
          : availablePipelines.length > 0
            ? "AVAILABLE"
            : "UNAVAILABLE",
        availablePipelines,
        rulesPreview: template.rules.map((rule) => ({
          trigger: rule.trigger,
          triggerStageId: rule.triggerStageId ?? null,
          triggerStageLabel: rule.triggerStageId ?? null,
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
  ): Promise<InstallWorkflowTemplateResult> {
    const template = getCrmWorkflowTemplateByKey(templateKey);
    if (!template) {
      throw createError(
        "Unknown workflow template",
        404,
        "workflow_template_unknown",
      );
    }

    return basePrisma.$transaction(async (tx) => {
      const pipeline =
        options?.pipelineId != null
          ? await this.findPipelineById(tx, tenantId, options.pipelineId)
          : await this.findPipelineByType(tx, tenantId, template.pipelineType);

      if (!pipeline) {
        throw createError(
          `No compatible ${template.pipelineType} pipeline found for template "${template.name}".`,
          400,
          "workflow_template_pipeline_missing",
        );
      }

      this.assertCompatibleInstallPipeline(template, pipeline);

      const resolvedRules = await this.resolveTemplateRules(
        tx,
        tenantId,
        pipeline,
        template,
      );

      const existing = await tx.pipelineWorkflow.findFirst({
        where: {
          tenantId,
          templateKey,
        },
      });

      let workflowId = existing?.id;
      let outcome: InstallWorkflowTemplateResult["outcome"] = "installed";

      if (existing && options?.overwriteExisting !== true) {
        logger.request(
          "Workflow template install reused existing workflow",
          undefined,
          {
            tenantId,
            templateKey,
            pipelineId: existing.pipelineId,
            requestedPipelineId: pipeline.id,
          },
        );
        return {
          outcome: "reused",
          workflow: await this.findWorkflowWithDetails(
            tx,
            tenantId,
            existing.id,
          ),
        };
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
        outcome = "overwritten";
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
        throw createError(
          "Template workflow installation failed",
          500,
          "workflow_template_install_failed",
        );
      }

      if (resolvedRules.length > 0) {
        await tx.workflowRule.createMany({
          data: this.buildTemplateRules(workflowId, resolvedRules),
        });
      }

      logger.request("Workflow template installed", undefined, {
        tenantId,
        templateKey,
        pipelineId: pipeline.id,
        outcome,
      });

      return {
        outcome,
        workflow: await this.findWorkflowWithDetails(tx, tenantId, workflowId),
      };
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
