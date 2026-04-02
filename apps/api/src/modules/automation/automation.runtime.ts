import type { Prisma } from "@prisma/client";
import {
  AUTOMATION_TRIGGER_EVENT_VALUES,
  EnvFeature,
  isEnvFeatureEnabled,
  parseFeatureFlagsEnv,
  parseAutomationActionConfig,
  type AutomationActionConfigValue,
  type AutomationCondition,
  type CrmCompanyUpdateActionConfig,
  type CrmContactUpdateActionConfig,
  type WorkItemCreateActionConfig,
  type NotificationSendActionConfig,
  type TransferCreateDraftActionConfig,
  type CrmActivityCreateActionConfig,
  type CrmDealMoveStageActionConfig,
  type RecordUpdateFieldActionConfig,
  type WebhookEmitActionConfig,
} from "@repo/shared";
import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { basePrisma } from "@/config/prisma";
import notificationRepository from "@/modules/notifications/notification.repository";
import transferRepository from "@/modules/transfers/transfer.repository";
import activityRepository from "@/modules/activities/activity.repository";
import dealService from "@/modules/deals/deal.service";
import automationRepository, {
  type CreateAutomationEventInput,
  type CreateAutomationRunInput,
} from "./automation.repository";

interface AutomationEventPayload {
  id: string;
  tenantId: string;
  eventName: string;
  scopeType: string | null;
  scopeId: string | null;
  entityType: string;
  entityId: string;
  actorUserId: string | null;
  dedupeKey: string | null;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

interface RuntimeContext {
  event: AutomationEventPayload;
  outputs: Record<string, unknown>;
  lastOutput: unknown;
}

const MAX_AUTOMATION_EVENT_ATTEMPTS = 8;
const AUTOMATION_RETRY_SWEEP_LIMIT = 20;
const AUTOMATION_RETRY_INTERVAL_MS = 30_000;
const AUTOMATION_PROCESSING_STALE_AFTER_MS = 2 * 60 * 1000;
const WEBHOOK_TIMEOUT_MS = 10_000;
const MAX_AUTOMATION_RETRY_DELAY_MS = 15 * 60 * 1000;

class AutomationProcessingError extends Error {
  constructor(
    message: string,
    readonly options?: {
      retryable?: boolean;
      retryAfterMs?: number;
    },
  ) {
    super(message);
  }
}

type ActionHandler = (args: {
  automation: Awaited<
    ReturnType<typeof automationRepository.findDefinitionById>
  >;
  config: AutomationActionConfigValue;
  context: RuntimeContext;
  runId: string;
}) => Promise<unknown>;

const automationFeatureEnabled = isEnvFeatureEnabled(
  EnvFeature.AUTOMATION,
  env.appEnv,
  parseFeatureFlagsEnv(env.featureFlags),
);

const ACTION_ALLOWED_EVENTS = {
  "workitem.create": AUTOMATION_TRIGGER_EVENT_VALUES,
  "notification.send": AUTOMATION_TRIGGER_EVENT_VALUES,
  "transfer.create_draft": [
    "inventory.stock.adjusted",
    "inventory.stock.set",
    "inventory.stock.low_detected",
    "inventory.stock.threshold_crossed",
  ],
  "record.update_field": AUTOMATION_TRIGGER_EVENT_VALUES,
  "crm.contact.update": AUTOMATION_TRIGGER_EVENT_VALUES,
  "crm.company.update": AUTOMATION_TRIGGER_EVENT_VALUES,
  "crm.deal.move_stage": ["crm.deal.created", "crm.deal.stage_changed"],
  "crm.activity.create": [
    "crm.deal.created",
    "crm.deal.stage_changed",
    "crm.contact.created",
    "crm.contact.updated",
    "crm.company.created",
    "crm.company.updated",
    "crm.activity.created",
    "crm.lead.created",
    "crm.lead.assigned",
    "crm.lead.converted",
  ],
  "webhook.emit": AUTOMATION_TRIGGER_EVENT_VALUES,
} as const satisfies Record<string, readonly string[]>;

const RECORD_UPDATE_FIELD_ALLOWLIST = {
  DEAL: ["status", "stage", "assignedToId", "expectedCloseDate"],
  CONTACT: ["source", "email", "phone", "ownerId", "status"],
  COMPANY: ["name", "website", "address", "phone"],
  MEMBER: ["name", "email", "notes", "memberStatus"],
  PRODUCT: [
    "name",
    "description",
    "subCategory",
    "vendorId",
    "costPrice",
    "mrp",
  ],
  CATEGORY: ["name", "description"],
  VENDOR: ["name", "contact", "address", "phone"],
  LOCATION: ["name", "address", "isActive", "isDefaultWarehouse"],
  SALE: ["notes"],
  TRANSFER: ["notes"],
  WORK_ITEM: ["status", "priority", "assignedToId", "dueDate"],
} as const satisfies Record<string, readonly string[]>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getPathValue(source: unknown, path: string): unknown {
  return path
    .split(".")
    .filter(Boolean)
    .reduce<unknown>((acc, segment) => {
      if (!isRecord(acc)) return undefined;
      return acc[segment];
    }, source);
}

function isActionAllowedForEvent(
  actionType: string,
  eventName: string,
): boolean {
  return ACTION_ALLOWED_EVENTS[actionType]?.includes(eventName) ?? false;
}

function getRetryDelayMs(attempt: number): number {
  const exponentialDelay = Math.min(
    MAX_AUTOMATION_RETRY_DELAY_MS,
    1_000 * 2 ** Math.max(0, attempt - 1),
  );
  const jitterMultiplier = 0.5 + Math.random();
  return Math.round(exponentialDelay * jitterMultiplier);
}

function parseRetryAfterMs(headerValue: string | null): number | null {
  if (!headerValue) return null;

  const seconds = Number(headerValue);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const timestamp = Date.parse(headerValue);
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return Math.max(timestamp - Date.now(), 0);
}

function getRetryDecision(
  error: unknown,
  attempts: number,
): {
  errorMessage: string;
  shouldRetry: boolean;
  nextAttemptAt?: Date;
} {
  const errorMessage =
    error instanceof Error
      ? error.message
      : "Automation event processing failed";
  const retryable =
    error instanceof AutomationProcessingError
      ? (error.options?.retryable ?? true)
      : true;

  if (!retryable || attempts >= MAX_AUTOMATION_EVENT_ATTEMPTS) {
    return { errorMessage, shouldRetry: false };
  }

  const retryAfterMs =
    error instanceof AutomationProcessingError
      ? error.options?.retryAfterMs
      : undefined;
  const nextAttemptAt = new Date(
    Date.now() +
      (retryAfterMs != null ? retryAfterMs : getRetryDelayMs(attempts)),
  );

  return { errorMessage, shouldRetry: true, nextAttemptAt };
}

function buildShadowStepPreview(
  actionType: string,
  renderedConfig: unknown,
): Record<string, unknown> {
  return {
    simulated: true,
    actionType,
    renderedConfig,
  };
}

function parseJsonObjectAtPath(
  source: Record<string, unknown>,
  path: string,
  errorLabel: string,
): Record<string, unknown> {
  const value = getPathValue(source, path);
  if (!isRecord(value)) {
    throw new Error(`${errorLabel} missing at "${path}"`);
  }
  return value;
}

async function resolveAssignableUserId(
  tenantId: string,
  candidateUserId: string | null | undefined,
): Promise<string | null> {
  if (!candidateUserId) return null;

  const user = await basePrisma.user.findFirst({
    where: {
      id: candidateUserId,
      tenantId,
    },
    select: { id: true },
  });

  return user?.id ?? null;
}

async function resolveExistingActorUserId(
  tenantId: string,
  candidateUserId: string | null | undefined,
): Promise<string | null> {
  if (!candidateUserId) return null;

  const user = await basePrisma.user.findFirst({
    where: { id: candidateUserId, tenantId },
    select: { id: true },
  });

  return user?.id ?? null;
}

function renderTemplateString(
  template: string,
  context: RuntimeContext,
): string {
  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, rawPath: string) => {
    const path = rawPath.trim();
    const value = getPathValue(
      {
        event: {
          ...context.event,
          payload: context.event.payload,
        },
        outputs: context.outputs,
        lastOutput: context.lastOutput,
      },
      path,
    );
    return value == null ? "" : String(value);
  });
}

async function createRunSafely(input: CreateAutomationRunInput) {
  try {
    return await automationRepository.createRun(input);
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "P2002" && input.dedupeKey) {
      return automationRepository.findRunByDedupeKey(
        input.tenantId,
        input.dedupeKey,
      );
    }
    throw error;
  }
}

function renderTemplateValue<T>(value: T, context: RuntimeContext): T {
  if (typeof value === "string") {
    return renderTemplateString(value, context) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => renderTemplateValue(item, context)) as T;
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        renderTemplateValue(entry, context),
      ]),
    ) as T;
  }
  return value;
}

function evaluateCondition(
  payload: Record<string, unknown>,
  condition: AutomationCondition,
): boolean {
  const actual = getPathValue(payload, condition.path);

  switch (condition.operator) {
    case "exists":
      return actual !== undefined && actual !== null;
    case "eq":
      return actual === condition.value;
    case "neq":
      return actual !== condition.value;
    case "gt":
      return Number(actual) > Number(condition.value);
    case "gte":
      return Number(actual) >= Number(condition.value);
    case "lt":
      return Number(actual) < Number(condition.value);
    case "lte":
      return Number(actual) <= Number(condition.value);
    case "contains":
      return String(actual ?? "").includes(String(condition.value ?? ""));
    case "in":
      return Array.isArray(condition.value)
        ? condition.value.includes(actual)
        : false;
    default:
      return false;
  }
}

function matchesConditions(
  payload: Record<string, unknown>,
  rawConditions: unknown,
): boolean {
  if (!Array.isArray(rawConditions) || rawConditions.length === 0) return true;
  return rawConditions.every((condition) =>
    evaluateCondition(payload, condition as AutomationCondition),
  );
}

const actionHandlers: Record<string, ActionHandler> = {
  "workitem.create": async ({ automation, config, context, runId }) => {
    const parsed = renderTemplateValue(
      config,
      context,
    ) as WorkItemCreateActionConfig;
    const dueDate =
      parsed.dueInHours != null
        ? new Date(Date.now() + parsed.dueInHours * 60 * 60 * 1000)
        : null;
    const links =
      parsed.links?.map((link) => ({
        entityType: link.entityType,
        entityId: renderTemplateString(link.entityIdTemplate, context),
      })) ?? [];
    const assignedToId = await resolveAssignableUserId(
      context.event.tenantId,
      parsed.assignedToId ?? context.event.actorUserId ?? null,
    );
    const createdById = await resolveExistingActorUserId(
      context.event.tenantId,
      context.event.actorUserId,
    );

    const workItem = await automationRepository.createWorkItem({
      tenantId: context.event.tenantId,
      automationId: automation?.id ?? null,
      automationRunId: runId,
      type: parsed.type,
      priority: parsed.priority,
      title: parsed.title,
      description: parsed.description ?? null,
      dueDate,
      assignedToId,
      createdById,
      prefillPayload: parsed.prefillPayloadPath
        ? ((getPathValue(context.event.payload, parsed.prefillPayloadPath) as
            | Prisma.InputJsonValue
            | null
            | undefined) ?? null)
        : null,
      metadata: (parsed.metadata as Prisma.InputJsonValue | undefined) ?? null,
      links,
    });

    return { workItemId: workItem.id };
  },
  "notification.send": async ({ config, context }) => {
    const parsed = renderTemplateValue(
      config,
      context,
    ) as NotificationSendActionConfig;
    const userId = await resolveAssignableUserId(
      context.event.tenantId,
      parsed.userId ?? context.event.actorUserId,
    );
    if (!userId) return { skipped: true, reason: "No target user" };
    const notification = await notificationRepository.create({
      userId,
      type: parsed.type as never,
      title: parsed.title,
      message: parsed.message,
      resourceType: context.event.entityType.toLowerCase(),
      resourceId: context.event.entityId,
    });
    return { notificationId: notification.id };
  },
  "transfer.create_draft": async ({ config, context, runId }) => {
    const parsed = renderTemplateValue(
      config,
      context,
    ) as TransferCreateDraftActionConfig;
    const transferPayload = parseJsonObjectAtPath(
      context.event.payload,
      parsed.payloadPath,
      "Transfer draft payload",
    );
    const items = transferPayload.items;
    const createdById = await resolveExistingActorUserId(
      context.event.tenantId,
      context.event.actorUserId ??
        String(getPathValue(transferPayload, "createdById") ?? ""),
    );
    if (!createdById) {
      throw new Error("Transfer draft requires a valid actor or createdById");
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Transfer draft requires at least one item");
    }
    const sourceInventorySignalId =
      typeof context.event.payload.signalId === "string"
        ? context.event.payload.signalId
        : null;
    if (sourceInventorySignalId) {
      const existingTransfer =
        await transferRepository.findActiveAutoDraftTransferBySignal(
          sourceInventorySignalId,
        );
      if (existingTransfer) {
        return {
          skipped: true,
          reason: "Auto-draft transfer already exists for signal",
          transferId: existingTransfer.id,
          transferCode: existingTransfer.transferCode,
        };
      }
    }

    const transfer = await transferRepository.createTransfer({
      tenantId: context.event.tenantId,
      fromLocationId: String(transferPayload.fromLocationId),
      toLocationId: String(transferPayload.toLocationId),
      createdById,
      sourceInventorySignalId,
      automationRunId: runId,
      notes: parsed.notes ?? String(transferPayload.notes ?? ""),
      items: items.map((item) => ({
        variationId: String((item as Record<string, unknown>).variationId),
        subVariationId:
          ((item as Record<string, unknown>).subVariationId as string | null) ??
          null,
        quantity: Number((item as Record<string, unknown>).quantity),
      })),
    });

    await transferRepository.createTransferLog(
      transfer.id,
      "AUTO_DRAFTED",
      createdById,
      {
        automationEventName: context.event.eventName,
      },
    );

    return { transferId: transfer.id, transferCode: transfer.transferCode };
  },
  "crm.activity.create": async ({ config, context }) => {
    const parsed = renderTemplateValue(
      config,
      context,
    ) as CrmActivityCreateActionConfig;
    const payload = context.event.payload;
    const createdById = await resolveExistingActorUserId(
      context.event.tenantId,
      context.event.actorUserId,
    );
    if (!createdById) {
      return { skipped: true, reason: "No valid actor for CRM activity" };
    }
    const activity = await activityRepository.create({
      tenantId: context.event.tenantId,
      type: parsed.type,
      subject: parsed.subject,
      notes: parsed.notes ?? null,
      activityAt: parsed.activityAtPath
        ? new Date(String(getPathValue(payload, parsed.activityAtPath)))
        : new Date(),
      contactId: (getPathValue(payload, "contactId") as string | null) ?? null,
      memberId: (getPathValue(payload, "memberId") as string | null) ?? null,
      dealId:
        context.event.entityType === "DEAL"
          ? context.event.entityId
          : ((getPathValue(payload, "dealId") as string | null) ?? null),
      createdById,
    });
    return { activityId: activity.id };
  },
  "crm.contact.update": async ({ config, context }) => {
    const parsed = renderTemplateValue(
      config,
      context,
    ) as CrmContactUpdateActionConfig;
    const contactId = renderTemplateString(parsed.contactIdTemplate, context);
    await basePrisma.contact.update({
      where: { id: contactId },
      data: { [parsed.field]: parsed.value },
    });
    return { contactId, field: parsed.field };
  },
  "crm.company.update": async ({ config, context }) => {
    const parsed = renderTemplateValue(
      config,
      context,
    ) as CrmCompanyUpdateActionConfig;
    const companyId = renderTemplateString(parsed.companyIdTemplate, context);
    await basePrisma.company.update({
      where: { id: companyId },
      data: { [parsed.field]: parsed.value },
    });
    return { companyId, field: parsed.field };
  },
  "crm.deal.move_stage": async ({ config, context }) => {
    const parsed = renderTemplateValue(
      config,
      context,
    ) as CrmDealMoveStageActionConfig;
    const actorUserId = await resolveExistingActorUserId(
      context.event.tenantId,
      context.event.actorUserId,
    );
    if (!actorUserId) {
      return { skipped: true, reason: "No valid actor for deal stage move" };
    }
    const dealId = renderTemplateString(parsed.dealIdTemplate, context);
    await dealService.updateStageFromAutomation(
      context.event.tenantId,
      dealId,
      parsed.targetStageId,
      actorUserId,
      parsed.targetPipelineId,
    );
    return { dealId, targetStageId: parsed.targetStageId };
  },
  "record.update_field": async ({ config, context }) => {
    const parsed = renderTemplateValue(
      config,
      context,
    ) as RecordUpdateFieldActionConfig;
    const modelMap: Record<string, string> = {
      DEAL: "deal",
      CONTACT: "contact",
      COMPANY: "company",
      MEMBER: "member",
      PRODUCT: "product",
      CATEGORY: "category",
      VENDOR: "vendor",
      LOCATION: "location",
      SALE: "sale",
      TRANSFER: "transfer",
      WORK_ITEM: "workItem",
    };
    const delegateName = modelMap[parsed.entityType.toUpperCase()];
    if (!delegateName) {
      throw new Error(`Unsupported entity type "${parsed.entityType}"`);
    }
    const delegate = (
      basePrisma as unknown as Record<
        string,
        {
          update: (args: {
            where: { id: string };
            data: Record<string, unknown>;
          }) => Promise<unknown>;
        }
      >
    )[delegateName];
    if (!delegate?.update) {
      throw new Error(`Prisma delegate "${delegateName}" not available`);
    }
    const allowedFields =
      RECORD_UPDATE_FIELD_ALLOWLIST[
        parsed.entityType as keyof typeof RECORD_UPDATE_FIELD_ALLOWLIST
      ] ?? [];
    if (!allowedFields.includes(parsed.field as never)) {
      throw new Error(
        `Field "${parsed.field}" is not updatable for ${parsed.entityType}`,
      );
    }
    const entityId = renderTemplateString(parsed.entityIdTemplate, context);
    await delegate.update({
      where: { id: entityId },
      data: { [parsed.field]: parsed.value },
    });
    return { entityId, field: parsed.field };
  },
  "webhook.emit": async ({ config, context }) => {
    const parsed = renderTemplateValue(
      config,
      context,
    ) as WebhookEmitActionConfig;
    const payload = parsed.payloadPath
      ? getPathValue(context.event.payload, parsed.payloadPath)
      : context.event.payload;
    const startedAt = Date.now();
    const timeoutMs =
      parsed.timeoutSeconds != null
        ? parsed.timeoutSeconds * 1000
        : WEBHOOK_TIMEOUT_MS;
    let response: Response;
    try {
      response = await fetch(parsed.url, {
        method: parsed.method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload ?? {}),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      if ((error as Error).name === "TimeoutError") {
        throw new AutomationProcessingError(
          `Webhook timed out after ${timeoutMs}ms`,
          { retryable: true },
        );
      }
      throw new AutomationProcessingError(
        error instanceof Error ? error.message : "Webhook delivery failed",
        { retryable: true },
      );
    }
    if (!response.ok) {
      if (response.status === 429) {
        throw new AutomationProcessingError(
          `Webhook failed with status ${response.status}`,
          {
            retryable: true,
            retryAfterMs:
              parseRetryAfterMs(response.headers.get("retry-after")) ??
              undefined,
          },
        );
      }

      if (response.status >= 500) {
        throw new AutomationProcessingError(
          `Webhook failed with status ${response.status}`,
          { retryable: true },
        );
      }

      throw new AutomationProcessingError(
        `Webhook failed with status ${response.status}`,
        { retryable: false },
      );
    }
    return { status: response.status, durationMs: Date.now() - startedAt };
  },
};

export async function publishAutomationEvent(
  input: CreateAutomationEventInput,
): Promise<void> {
  if (!automationFeatureEnabled) return;

  try {
    const event = await automationRepository.createEvent(input);
    setImmediate(() => {
      void processAutomationEventById(event.id);
    });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "P2002" && input.dedupeKey) {
      logger.warn("Skipping duplicate automation event", undefined, {
        tenantId: input.tenantId,
        dedupeKey: input.dedupeKey,
        eventName: input.eventName,
      });
      return;
    }
    throw error;
  }
}

export async function processDueAutomationEvents(
  limit = AUTOMATION_RETRY_SWEEP_LIMIT,
): Promise<number> {
  if (!automationFeatureEnabled) return 0;

  const now = new Date();
  const staleProcessingBefore = new Date(
    now.getTime() - AUTOMATION_PROCESSING_STALE_AFTER_MS,
  );
  const eventIds = await automationRepository.findRetryableEventIds(
    now,
    staleProcessingBefore,
    MAX_AUTOMATION_EVENT_ATTEMPTS,
    limit,
  );

  await Promise.allSettled(
    eventIds.map((eventId) => processAutomationEventById(eventId)),
  );

  return eventIds.length;
}

export async function processAutomationEventById(
  eventId: string,
): Promise<void> {
  if (!automationFeatureEnabled) return;

  const eventRow = await automationRepository.findEventById(eventId);
  if (!eventRow) return;
  if (eventRow.status === "PROCESSED") return;

  const now = new Date();
  const claimed = await automationRepository.claimEventForProcessing(
    eventId,
    now,
    new Date(now.getTime() - AUTOMATION_PROCESSING_STALE_AFTER_MS),
  );
  if (!claimed) {
    return;
  }

  const claimedEvent = await automationRepository.findEventById(eventId);
  if (!claimedEvent) return;

  const event: AutomationEventPayload = {
    id: claimedEvent.id,
    tenantId: claimedEvent.tenantId,
    eventName: claimedEvent.eventName,
    scopeType: claimedEvent.scopeType,
    scopeId: claimedEvent.scopeId,
    entityType: claimedEvent.entityType,
    entityId: claimedEvent.entityId,
    actorUserId: claimedEvent.actorUserId,
    dedupeKey: claimedEvent.dedupeKey,
    payload: isRecord(claimedEvent.payload) ? claimedEvent.payload : {},
    occurredAt: claimedEvent.occurredAt,
  };

  try {
    const automations =
      await automationRepository.findMatchingDefinitions(event);

    for (const automation of automations) {
      const matchingTrigger = automation.triggers.find(
        (trigger) =>
          trigger.eventName === event.eventName &&
          matchesConditions(event.payload, trigger.conditionGroups),
      );
      if (!matchingTrigger) continue;

      const run = await createRunSafely({
        tenantId: event.tenantId,
        automationId: automation.id,
        automationEventId: event.id,
        status: "RUNNING",
        executionMode: automation.executionMode,
        eventName: event.eventName,
        entityType: event.entityType,
        entityId: event.entityId,
        actorUserId: event.actorUserId,
        dedupeKey: event.dedupeKey
          ? `${event.dedupeKey}:${automation.id}`
          : null,
        triggerPayload: event.payload as Prisma.InputJsonValue,
      });
      if (!run || run.status !== "RUNNING") {
        continue;
      }

      if (automation.executionMode === "SHADOW") {
        const shadowOutputs: Record<string, unknown> = {};
        const context: RuntimeContext = {
          event,
          outputs: shadowOutputs,
          lastOutput: null,
        };

        for (const step of automation.steps) {
          const parsedConfig = parseAutomationActionConfig(
            step.actionType as never,
            step.actionConfig,
          );
          const renderedConfig = renderTemplateValue(parsedConfig, context);
          const preview = buildShadowStepPreview(
            step.actionType,
            renderedConfig,
          );
          shadowOutputs[step.id] = preview;
          await automationRepository.createRunStep({
            automationRunId: run.id,
            automationStepId: step.id,
            status: "SKIPPED",
            output: preview as Prisma.InputJsonValue,
            errorMessage: "Shadow mode: side effects were not executed",
          });
        }

        await automationRepository.updateRun(run.id, {
          status: "SKIPPED",
          errorMessage: "Shadow mode: side effects were not executed",
          stepOutput: shadowOutputs as Prisma.InputJsonValue,
          completedAt: new Date(),
        });
        continue;
      }

      const context: RuntimeContext = {
        event,
        outputs: {},
        lastOutput: null,
      };

      let failed = false;

      for (const step of automation.steps) {
        const runStep = await automationRepository.createRunStep({
          automationRunId: run.id,
          automationStepId: step.id,
          status: "RUNNING",
        });

        try {
          if (!isActionAllowedForEvent(step.actionType, event.eventName)) {
            throw new Error(
              `Action "${step.actionType}" cannot run for "${event.eventName}"`,
            );
          }
          const parsedConfig = parseAutomationActionConfig(
            step.actionType as never,
            step.actionConfig,
          );
          const handler = actionHandlers[step.actionType];
          if (!handler) {
            throw new Error(`No handler registered for "${step.actionType}"`);
          }

          const output = await handler({
            automation,
            config: parsedConfig,
            context,
            runId: run.id,
          });

          context.outputs[step.id] = output ?? null;
          context.lastOutput = output ?? null;

          await automationRepository.updateRunStep(runStep.id, {
            status: "SUCCEEDED",
            output: (output as Prisma.InputJsonValue | undefined) ?? null,
            completedAt: new Date(),
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Automation step execution failed";
          await automationRepository.updateRunStep(runStep.id, {
            status: "FAILED",
            errorMessage: message,
            completedAt: new Date(),
          });

          if (!step.continueOnError) {
            failed = true;
            await automationRepository.updateRun(run.id, {
              status: "FAILED",
              errorMessage: message,
              stepOutput: context.outputs as Prisma.InputJsonValue,
              completedAt: new Date(),
            });
            if (error instanceof AutomationProcessingError) {
              throw error;
            }
            break;
          }
        }
      }

      if (!failed) {
        await automationRepository.updateRun(run.id, {
          status: "SUCCEEDED",
          stepOutput: context.outputs as Prisma.InputJsonValue,
          completedAt: new Date(),
        });
      }
    }

    await automationRepository.markEventProcessed(event.id);
  } catch (error) {
    const decision = getRetryDecision(error, claimedEvent.attempts);
    logger.error("Automation event processing failed", undefined, {
      eventId,
      error: decision.errorMessage,
    });
    if (decision.shouldRetry && decision.nextAttemptAt) {
      await automationRepository.markEventFailed(
        event.id,
        decision.errorMessage,
        decision.nextAttemptAt,
      );
      return;
    }

    await automationRepository.markEventExhausted(
      event.id,
      decision.errorMessage,
    );
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __automationRetryWorkerStarted: boolean | undefined;
}

if (
  automationFeatureEnabled &&
  process.env.NODE_ENV !== "test" &&
  !globalThis.__automationRetryWorkerStarted
) {
  globalThis.__automationRetryWorkerStarted = true;
  void processDueAutomationEvents().catch((error) => {
    logger.error("Initial automation retry sweep failed", undefined, {
      error: error instanceof Error ? error.message : String(error),
    });
  });
  const timer = setInterval(() => {
    void processDueAutomationEvents().catch((error) => {
      logger.error("Automation retry sweep failed", undefined, {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }, AUTOMATION_RETRY_INTERVAL_MS);
  timer.unref();
}
