import { Prisma } from "@prisma/client";
import { basePrisma } from "@/config/prisma";
import type {
  CreateAutomationDefinitionDto,
  CreateAutomationStepDto,
  CreateAutomationTriggerDto,
  GetAutomationDefinitionsQueryDto,
  UpdateAutomationDefinitionDto,
} from "./automation.schema";

const automationDefinitionInclude = {
  triggers: { orderBy: { createdAt: "asc" as const } },
  steps: { orderBy: { stepOrder: "asc" as const } },
} as const;

export interface CreateAutomationEventInput {
  tenantId: string;
  eventName: string;
  scopeType?:
    | "GLOBAL"
    | "CRM_PIPELINE"
    | "LOCATION"
    | "PRODUCT_VARIATION"
    | null;
  scopeId?: string | null;
  entityType: string;
  entityId: string;
  actorUserId?: string | null;
  dedupeKey?: string | null;
  payload: Prisma.InputJsonValue;
  occurredAt: Date;
}

export interface CreateAutomationRunInput {
  tenantId: string;
  automationId: string;
  automationEventId?: string | null;
  status: "RUNNING" | "SUCCEEDED" | "FAILED" | "SKIPPED";
  executionMode?: "LIVE" | "SHADOW";
  eventName: string;
  entityType: string;
  entityId: string;
  actorUserId?: string | null;
  dedupeKey?: string | null;
  triggerPayload: Prisma.InputJsonValue;
  /** Phase 3: frozen graph JSON at run start (resume / EC-12). */
  flowGraphSnapshot?: Prisma.InputJsonValue | null;
  stepOutput?: Prisma.InputJsonValue | null;
  errorMessage?: string | null;
}

export interface CreateAutomationRunStepInput {
  automationRunId: string;
  /** Set for linear `AutomationStep` runs. */
  automationStepId?: string | null;
  /** Set for Phase 3 graph `action` nodes. */
  graphNodeId?: string | null;
  status: "RUNNING" | "SUCCEEDED" | "FAILED" | "SKIPPED";
  output?: Prisma.InputJsonValue | null;
  errorMessage?: string | null;
}

export interface CreateWorkItemInput {
  tenantId: string;
  automationId?: string | null;
  automationRunId?: string | null;
  type:
    | "TASK"
    | "APPROVAL"
    | "TRANSFER_REQUEST"
    | "RESTOCK_REQUEST"
    | "FOLLOW_UP";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  title: string;
  description?: string | null;
  dueDate?: Date | null;
  assignedToId?: string | null;
  createdById?: string | null;
  prefillPayload?: Prisma.InputJsonValue | null;
  metadata?: Prisma.InputJsonValue | null;
  links?: Array<{
    entityType: string;
    entityId: string;
    inventorySignalId?: string | null;
  }>;
}

function toTriggerCreateMany(
  automationId: string,
  triggers: CreateAutomationTriggerDto[],
): Prisma.AutomationTriggerCreateManyInput[] {
  return triggers.map((trigger) => ({
    automationId,
    eventName: trigger.eventName,
    conditionGroups: (trigger.conditions ??
      null) as Prisma.InputJsonValue | null,
    delayMinutes: trigger.delayMinutes ?? 0,
  }));
}

function toStepCreateMany(
  automationId: string,
  steps: CreateAutomationStepDto[],
): Prisma.AutomationStepCreateManyInput[] {
  return steps.map((step, index) => ({
    automationId,
    stepOrder: index,
    actionType: step.actionType,
    actionConfig: step.actionConfig as Prisma.InputJsonValue,
    continueOnError: step.continueOnError ?? false,
  }));
}

export class AutomationRepository {
  async countDefinitions(
    tenantId: string,
    query: GetAutomationDefinitionsQueryDto,
  ): Promise<number> {
    return basePrisma.automationDefinition.count({
      where: this.buildDefinitionWhere(tenantId, query),
    });
  }

  async findDefinitions(
    tenantId: string,
    query: GetAutomationDefinitionsQueryDto,
  ) {
    return basePrisma.automationDefinition.findMany({
      where: this.buildDefinitionWhere(tenantId, query),
      include: automationDefinitionInclude,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
  }

  async findDefinitionById(tenantId: string, id: string) {
    return basePrisma.automationDefinition.findFirst({
      where: { id, tenantId },
      include: automationDefinitionInclude,
    });
  }

  async createDefinition(
    tenantId: string,
    userId: string,
    data: CreateAutomationDefinitionDto,
  ) {
    return basePrisma.$transaction(async (tx) => {
      const hasGraph =
        data.flowGraph != null &&
        typeof data.flowGraph === "object" &&
        !Array.isArray(data.flowGraph);

      const definition = await tx.automationDefinition.create({
        data: {
          tenantId,
          name: data.name.trim(),
          description: data.description?.trim() ?? null,
          scopeType: data.scopeType,
          scopeId: data.scopeId ?? null,
          status: data.status ?? "ACTIVE",
          executionMode: data.executionMode ?? "LIVE",
          suppressLegacyWorkflows: data.suppressLegacyWorkflows ?? false,
          source: "MANUAL",
          createdById: userId,
          updatedById: userId,
          publishedAt: new Date(),
          ...(hasGraph
            ? {
                flowGraph: data.flowGraph as Prisma.InputJsonValue,
              }
            : {}),
        },
      });

      await tx.automationTrigger.createMany({
        data: toTriggerCreateMany(definition.id, data.triggers),
      });
      if (!hasGraph) {
        await tx.automationStep.createMany({
          data: toStepCreateMany(definition.id, data.steps),
        });
      }

      return tx.automationDefinition.findUniqueOrThrow({
        where: { id: definition.id },
        include: automationDefinitionInclude,
      });
    });
  }

  async updateDefinition(
    tenantId: string,
    id: string,
    userId: string,
    data: UpdateAutomationDefinitionDto,
  ) {
    return basePrisma.$transaction(async (tx) => {
      const flowProvided = data.flowGraph !== undefined;
      const stepsProvided = data.steps !== undefined;

      const definitionPatch: Prisma.AutomationDefinitionUpdateInput = {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined
          ? { description: data.description?.trim() ?? null }
          : {}),
        ...(data.scopeType !== undefined ? { scopeType: data.scopeType } : {}),
        ...(data.scopeId !== undefined
          ? { scopeId: data.scopeId ?? null }
          : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.executionMode !== undefined
          ? { executionMode: data.executionMode }
          : {}),
        ...(data.suppressLegacyWorkflows !== undefined
          ? { suppressLegacyWorkflows: data.suppressLegacyWorkflows }
          : {}),
        updatedBy: { connect: { id: userId } },
        publishedAt: new Date(),
        version: { increment: 1 },
      };

      if (flowProvided) {
        definitionPatch.flowGraph =
          data.flowGraph === null
            ? Prisma.JsonNull
            : (data.flowGraph as Prisma.InputJsonValue);
      } else if (stepsProvided && data.steps && data.steps.length > 0) {
        definitionPatch.flowGraph = Prisma.JsonNull;
      }

      await tx.automationDefinition.update({
        where: { id },
        data: definitionPatch,
      });

      if (data.triggers) {
        await tx.automationTrigger.deleteMany({ where: { automationId: id } });
        await tx.automationTrigger.createMany({
          data: toTriggerCreateMany(id, data.triggers),
        });
      }

      if (flowProvided && data.flowGraph != null) {
        await tx.automationStep.deleteMany({ where: { automationId: id } });
      }

      if (
        stepsProvided &&
        (!flowProvided || data.flowGraph === null) &&
        data.steps
      ) {
        await tx.automationStep.deleteMany({ where: { automationId: id } });
        if (data.steps.length > 0) {
          await tx.automationStep.createMany({
            data: toStepCreateMany(id, data.steps),
          });
        }
      }

      return tx.automationDefinition.findFirstOrThrow({
        where: { id, tenantId },
        include: automationDefinitionInclude,
      });
    });
  }

  async archiveDefinition(tenantId: string, id: string, userId: string) {
    return basePrisma.automationDefinition.updateMany({
      where: { id, tenantId },
      data: {
        status: "ARCHIVED",
        updatedById: userId,
        version: { increment: 1 },
      },
    });
  }

  async createEvent(input: CreateAutomationEventInput) {
    return basePrisma.automationEvent.create({
      data: {
        tenantId: input.tenantId,
        eventName: input.eventName,
        scopeType: input.scopeType ?? null,
        scopeId: input.scopeId ?? null,
        entityType: input.entityType,
        entityId: input.entityId,
        actorUserId: input.actorUserId ?? null,
        dedupeKey: input.dedupeKey ?? null,
        payload: input.payload,
        occurredAt: input.occurredAt,
        nextAttemptAt: input.occurredAt,
      },
    });
  }

  async findEventById(id: string) {
    return basePrisma.automationEvent.findUnique({ where: { id } });
  }

  async claimEventForProcessing(
    id: string,
    now: Date,
    staleProcessingBefore: Date,
  ): Promise<boolean> {
    const result = await basePrisma.automationEvent.updateMany({
      where: {
        id,
        OR: [
          {
            status: { in: ["PENDING", "FAILED"] },
            nextAttemptAt: { lte: now },
          },
          {
            status: "PROCESSING",
            processingStartedAt: { lte: staleProcessingBefore },
          },
        ],
      },
      data: {
        status: "PROCESSING",
        attempts: { increment: 1 },
        lastAttemptAt: now,
        processingStartedAt: now,
        errorMessage: null,
      },
    });

    return result.count > 0;
  }

  async markEventProcessed(id: string) {
    return basePrisma.automationEvent.update({
      where: { id },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
        processingStartedAt: null,
        errorMessage: null,
      },
    });
  }

  async markEventFailed(id: string, errorMessage: string, nextAttemptAt: Date) {
    return basePrisma.automationEvent.update({
      where: { id },
      data: {
        status: "FAILED",
        errorMessage,
        nextAttemptAt,
        processingStartedAt: null,
      },
    });
  }

  async markEventExhausted(id: string, errorMessage: string) {
    return basePrisma.automationEvent.update({
      where: { id },
      data: {
        status: "EXHAUSTED",
        errorMessage,
        processingStartedAt: null,
        nextAttemptAt: new Date(),
      },
    });
  }

  async findRetryableEventIds(
    now: Date,
    staleProcessingBefore: Date,
    maxAttempts: number,
    limit: number,
  ): Promise<string[]> {
    const events = await basePrisma.automationEvent.findMany({
      where: {
        attempts: { lt: maxAttempts },
        OR: [
          {
            status: { in: ["PENDING", "FAILED"] },
            nextAttemptAt: { lte: now },
          },
          {
            status: "PROCESSING",
            processingStartedAt: { lte: staleProcessingBefore },
          },
        ],
      },
      orderBy: [{ nextAttemptAt: "asc" }, { occurredAt: "asc" }],
      take: limit,
      select: { id: true },
    });

    return events.map((event) => event.id);
  }

  async findMatchingDefinitions(event: {
    tenantId: string;
    eventName: string;
    scopeType?: string | null;
    scopeId?: string | null;
  }) {
    const scopeFilters: Prisma.AutomationDefinitionWhereInput[] = [
      { scopeType: "GLOBAL", scopeId: null },
    ];

    if (event.scopeType && event.scopeId) {
      scopeFilters.push({
        scopeType: event.scopeType as
          | "GLOBAL"
          | "CRM_PIPELINE"
          | "LOCATION"
          | "PRODUCT_VARIATION",
        scopeId: event.scopeId,
      });
    }

    return basePrisma.automationDefinition.findMany({
      where: {
        tenantId: event.tenantId,
        status: "ACTIVE",
        OR: scopeFilters,
        triggers: {
          some: {
            eventName: event.eventName,
          },
        },
      },
      include: automationDefinitionInclude,
      orderBy: { createdAt: "asc" },
    });
  }

  async createRun(input: CreateAutomationRunInput) {
    return basePrisma.automationRun.create({
      data: {
        tenantId: input.tenantId,
        automationId: input.automationId,
        automationEventId: input.automationEventId ?? null,
        status: input.status,
        executionMode: input.executionMode ?? "LIVE",
        eventName: input.eventName,
        entityType: input.entityType,
        entityId: input.entityId,
        actorUserId: input.actorUserId ?? null,
        dedupeKey: input.dedupeKey ?? null,
        triggerPayload: input.triggerPayload,
        ...(input.flowGraphSnapshot !== undefined
          ? { flowGraphSnapshot: input.flowGraphSnapshot }
          : {}),
        stepOutput: input.stepOutput ?? null,
        errorMessage: input.errorMessage ?? null,
      },
    });
  }

  async findRunByDedupeKey(tenantId: string, dedupeKey: string) {
    return basePrisma.automationRun.findFirst({
      where: { tenantId, dedupeKey },
    });
  }

  async updateRun(id: string, data: Prisma.AutomationRunUpdateInput) {
    return basePrisma.automationRun.update({
      where: { id },
      data,
    });
  }

  /**
   * LIVE graph: atomically persist `stepOutput` (branchDecisions + cursor) and
   * create the RUNNING action run step — §8.2 / AT-RSU-005 (no half state between them).
   */
  async createGraphActionRunStepWithCheckpoint(input: {
    runId: string;
    stepOutput: Prisma.InputJsonValue;
    graphNodeId: string;
  }) {
    return basePrisma.$transaction(async (tx) => {
      await tx.automationRun.update({
        where: { id: input.runId },
        data: { stepOutput: input.stepOutput },
      });
      return tx.automationRunStep.create({
        data: {
          automationRunId: input.runId,
          automationStepId: null,
          graphNodeId: input.graphNodeId,
          status: "RUNNING",
        },
      });
    });
  }

  async createRunStep(input: CreateAutomationRunStepInput) {
    return basePrisma.automationRunStep.create({
      data: {
        automationRunId: input.automationRunId,
        automationStepId: input.automationStepId ?? null,
        graphNodeId: input.graphNodeId ?? null,
        status: input.status,
        output: input.output ?? null,
        errorMessage: input.errorMessage ?? null,
      },
    });
  }

  async updateRunStep(id: string, data: Prisma.AutomationRunStepUpdateInput) {
    return basePrisma.automationRunStep.update({
      where: { id },
      data,
    });
  }

  async findRunsByAutomation(
    tenantId: string,
    automationId: string,
    limit: number,
  ) {
    return basePrisma.automationRun.findMany({
      where: { tenantId, automationId },
      orderBy: { startedAt: "desc" },
      take: limit,
      include: {
        runSteps: {
          orderBy: { startedAt: "asc" },
        },
      },
    });
  }

  async createWorkItem(input: CreateWorkItemInput) {
    return basePrisma.workItem.create({
      data: {
        tenantId: input.tenantId,
        automationId: input.automationId ?? null,
        automationRunId: input.automationRunId ?? null,
        type: input.type,
        priority: input.priority,
        title: input.title.trim(),
        description: input.description ?? null,
        dueDate: input.dueDate ?? null,
        assignedToId: input.assignedToId ?? null,
        createdById: input.createdById ?? null,
        prefillPayload: input.prefillPayload ?? null,
        metadata: input.metadata ?? null,
        links: input.links
          ? {
              create: input.links.map((link) => ({
                entityType: link.entityType,
                entityId: link.entityId,
                inventorySignalId: link.inventorySignalId ?? null,
              })),
            }
          : undefined,
      },
      include: {
        links: true,
      },
    });
  }

  async findOpenInventorySignal(
    tenantId: string,
    locationId: string,
    variationId: string,
    subVariationId: string | null,
  ) {
    return basePrisma.inventorySignal.findFirst({
      where: {
        tenantId,
        locationId,
        variationId,
        subVariationId,
        status: "ACTIVE",
      },
    });
  }

  async createInventorySignal(data: {
    tenantId: string;
    locationId: string;
    variationId: string;
    subVariationId: string | null;
    threshold: number;
    currentQuantity: number;
    recommendedSourceLocationId?: string | null;
    detectedById?: string | null;
    metadata?: Prisma.InputJsonValue | null;
  }) {
    return basePrisma.inventorySignal.create({
      data: {
        tenantId: data.tenantId,
        locationId: data.locationId,
        variationId: data.variationId,
        subVariationId: data.subVariationId,
        threshold: data.threshold,
        currentQuantity: data.currentQuantity,
        recommendedSourceLocationId: data.recommendedSourceLocationId ?? null,
        detectedById: data.detectedById ?? null,
        metadata: data.metadata ?? null,
      },
    });
  }

  async resolveInventorySignal(id: string, currentQuantity: number) {
    return basePrisma.inventorySignal.update({
      where: { id },
      data: {
        status: "RESOLVED",
        currentQuantity,
        resolvedAt: new Date(),
      },
    });
  }

  async updateInventorySignal(
    id: string,
    data: Prisma.InventorySignalUpdateInput,
  ) {
    return basePrisma.inventorySignal.update({
      where: { id },
      data,
    });
  }

  async findLocationInventorySummary(
    locationId: string,
    variationId: string,
    subVariationId: string | null,
  ) {
    return basePrisma.locationInventory.findFirst({
      where: {
        locationId,
        variationId,
        subVariationId,
      },
      include: {
        location: true,
        variation: {
          select: {
            id: true,
            lowStockThreshold: true,
            product: {
              select: {
                id: true,
                name: true,
                imsCode: true,
              },
            },
          },
        },
        subVariation: {
          select: {
            id: true,
            name: true,
            lowStockThreshold: true,
          },
        },
      },
    });
  }

  async findBestTransferSource(
    tenantId: string,
    targetLocationId: string,
    variationId: string,
    subVariationId: string | null,
  ) {
    return basePrisma.locationInventory.findFirst({
      where: {
        location: {
          tenantId,
          id: { not: targetLocationId },
          isActive: true,
        },
        variationId,
        subVariationId,
        quantity: { gt: 0 },
      },
      include: {
        location: true,
      },
      orderBy: { quantity: "desc" },
    });
  }

  async createDelayedRun(input: {
    tenantId: string;
    automationEventId: string;
    automationDefinitionId: string;
    automationTriggerId: string;
    fireAt: Date;
  }) {
    return basePrisma.automationDelayedRun.create({
      data: {
        tenantId: input.tenantId,
        automationEventId: input.automationEventId,
        automationDefinitionId: input.automationDefinitionId,
        automationTriggerId: input.automationTriggerId,
        fireAt: input.fireAt,
      },
    });
  }

  async findDueDelayedRuns(
    now: Date,
    limit: number,
  ): Promise<
    Array<{
      id: string;
      tenantId: string;
      automationEventId: string;
      automationDefinitionId: string;
      automationTriggerId: string;
    }>
  > {
    return basePrisma.automationDelayedRun.findMany({
      where: { status: "PENDING", fireAt: { lte: now } },
      orderBy: { fireAt: "asc" },
      take: limit,
      select: {
        id: true,
        tenantId: true,
        automationEventId: true,
        automationDefinitionId: true,
        automationTriggerId: true,
      },
    });
  }

  async claimDelayedRun(id: string): Promise<boolean> {
    const result = await basePrisma.automationDelayedRun.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "PROCESSING" },
    });
    return result.count === 1;
  }

  async completeDelayedRun(id: string): Promise<void> {
    await basePrisma.automationDelayedRun.update({
      where: { id },
      data: { status: "COMPLETED", processedAt: new Date() },
    });
  }

  async failDelayedRun(id: string, errorMessage: string): Promise<void> {
    await basePrisma.automationDelayedRun.update({
      where: { id },
      data: {
        status: "FAILED",
        errorMessage: errorMessage.slice(0, 2000),
        processedAt: new Date(),
      },
    });
  }

  async findFailedLiveRunsForEventReplay(
    tenantId: string,
    automationEventId: string,
  ) {
    return basePrisma.automationRun.findMany({
      where: {
        tenantId,
        automationEventId,
        status: "FAILED",
        executionMode: "LIVE",
      },
      include: {
        runSteps: { orderBy: { startedAt: "asc" } },
        automation: {
          include: {
            steps: { orderBy: { stepOrder: "asc" } },
            triggers: { orderBy: { createdAt: "asc" } },
          },
        },
      },
    });
  }

  async hasActiveAutomationSuppressingLegacyWorkflow(input: {
    tenantId: string;
    eventName: string;
    pipelineId: string;
  }): Promise<boolean> {
    const count = await basePrisma.automationDefinition.count({
      where: {
        tenantId: input.tenantId,
        status: "ACTIVE",
        suppressLegacyWorkflows: true,
        OR: [
          { scopeType: "GLOBAL", scopeId: null },
          {
            scopeType: "CRM_PIPELINE",
            scopeId: input.pipelineId,
          },
        ],
        triggers: {
          some: {
            eventName: input.eventName,
          },
        },
      },
    });

    return count > 0;
  }

  private buildDefinitionWhere(
    tenantId: string,
    query: GetAutomationDefinitionsQueryDto,
  ): Prisma.AutomationDefinitionWhereInput {
    return {
      tenantId,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { description: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.scopeType ? { scopeType: query.scopeType } : {}),
    };
  }
}

export default new AutomationRepository();
