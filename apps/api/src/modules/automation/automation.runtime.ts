import type { Prisma } from "@prisma/client";
import {
  AUTOMATION_TRIGGER_EVENT_VALUES,
  AutomationFlowGraphPayloadSchema,
  EnvFeature,
  isEnvFeatureEnabled,
  MAX_AUTOMATION_FLOW_GRAPH_NODES,
  parseFeatureFlagsEnv,
  parseAutomationActionConfig,
  validateAutomationFlowGraphStructure,
  type AutomationActionConfigValue,
  type AutomationCondition,
  type ValidatedFlowGraph,
  type CrmCompanyUpdateActionConfig,
  type CrmContactUpdateActionConfig,
  type WorkItemCreateActionConfig,
  type NotificationSendActionConfig,
  type TransferCreateDraftActionConfig,
  type CrmActivityCreateActionConfig,
  type CrmDealMoveStageActionConfig,
  type RecordUpdateFieldActionConfig,
  type WebhookEmitActionConfig,
  type CrmContactAddTagActionConfig,
  type CrmContactAddNoteActionConfig,
  type CrmDealCreateActionConfig,
} from "@repo/shared";
import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { basePrisma } from "@/config/prisma";
import { automationEventQueue } from "@/queues/automation-queue";
import { getIO } from "@/config/socket.config";
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

/** BR-16: replay uses persisted `branchDecisions` for nodes in this set; never re-evaluate those. */
type LiveGraphResumeSeed = {
  branchDecisions: Record<string, string>;
  context: RuntimeContext;
  existingByNodeId: Map<
    string,
    {
      runStepId: string;
      status: "RUNNING" | "SUCCEEDED" | "FAILED" | "SKIPPED";
    }
  >;
};

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
  "crm.contact.add_tag": AUTOMATION_TRIGGER_EVENT_VALUES,
  "crm.contact.add_note": AUTOMATION_TRIGGER_EVENT_VALUES,
  "crm.deal.create": AUTOMATION_TRIGGER_EVENT_VALUES,
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

function normalizeInConditionValue(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : null;
      } catch {
        return null;
      }
    }
    if (trimmed.includes(",")) {
      return trimmed
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return trimmed ? [trimmed] : null;
  }
  return null;
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

function emitRunUpdate(
  tenantId: string,
  runId: string,
  automationId: string,
  status: "SUCCEEDED" | "FAILED" | "SKIPPED",
): void {
  try {
    getIO()?.to(`tenant:${tenantId}`).emit("automation:run:updated", {
      runId,
      automationId,
      status,
      completedAt: new Date().toISOString(),
    });
  } catch {
    // Never break execution for a socket emit failure
  }
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

type AutomationDefinitionGraph = Awaited<
  ReturnType<typeof automationRepository.findMatchingDefinitions>
>[number];

function eventRowToPayload(row: {
  id: string;
  tenantId: string;
  eventName: string;
  scopeType: string | null;
  scopeId: string | null;
  entityType: string;
  entityId: string;
  actorUserId: string | null;
  dedupeKey: string | null;
  payload: unknown;
  occurredAt: Date;
}): AutomationEventPayload {
  return {
    id: row.id,
    tenantId: row.tenantId,
    eventName: row.eventName,
    scopeType: row.scopeType,
    scopeId: row.scopeId,
    entityType: row.entityType,
    entityId: row.entityId,
    actorUserId: row.actorUserId,
    dedupeKey: row.dedupeKey,
    payload: isRecord(row.payload) ? row.payload : {},
    occurredAt: row.occurredAt,
  };
}

function sortAutomationSteps(automation: AutomationDefinitionGraph) {
  return [...automation.steps].sort((a, b) => a.stepOrder - b.stepOrder);
}

function parseValidatedFlowGraphFromDb(
  flowGraph: unknown,
): ValidatedFlowGraph | null {
  if (
    flowGraph == null ||
    typeof flowGraph !== "object" ||
    Array.isArray(flowGraph)
  ) {
    return null;
  }
  const parsed = AutomationFlowGraphPayloadSchema.safeParse(flowGraph);
  if (!parsed.success) return null;
  const s = validateAutomationFlowGraphStructure(parsed.data);
  return s.ok ? s.validated : null;
}

/** Count directed paths from `from` to `target` (DAG, small cap). */
function countPathsToTargetDb(
  outgoing: ValidatedFlowGraph["outgoing"],
  from: string,
  target: string,
  memo: Map<string, number>,
): number {
  if (from === target) return 1;
  if (memo.has(from)) return memo.get(from)!;
  let sum = 0;
  for (const edge of outgoing.get(from) ?? []) {
    sum += countPathsToTargetDb(outgoing, edge.toNodeId, target, memo);
    if (sum > 128) break;
  }
  memo.set(from, sum);
  return sum;
}

/**
 * When exactly one path exists from `entry` to `target`, returns ordered node ids on that path.
 */
function singlePathNodeIdsToTarget(
  validated: ValidatedFlowGraph,
  target: string,
): string[] | null {
  const { outgoing, entryId } = validated;
  const memo = new Map<string, number>();
  if (countPathsToTargetDb(outgoing, entryId, target, memo) !== 1) {
    return null;
  }

  const path: string[] = [];
  let cur = entryId;
  for (let guard = 0; guard < MAX_AUTOMATION_FLOW_GRAPH_NODES + 5; guard++) {
    path.push(cur);
    if (cur === target) return path;
    const outs = outgoing.get(cur) ?? [];
    let nextId: string | null = null;
    for (const o of outs) {
      const childMemo = new Map<string, number>();
      if (countPathsToTargetDb(outgoing, o.toNodeId, target, childMemo) > 0) {
        if (nextId !== null) return null;
        nextId = o.toNodeId;
      }
    }
    if (nextId === null) return null;
    cur = nextId;
  }
  return null;
}

/**
 * AT-RSU-003 / EC-11: if there is exactly one path from entry to the failed action, every `if` /
 * `switch` on that path must have a persisted branch decision (no silent re-routing on resume).
 */
function validatePersistedBranchDecisionsForGraphResume(
  validated: ValidatedFlowGraph,
  failedActionGraphNodeId: string,
  branchDecisions: Record<string, string>,
): string | null {
  const pathIds = singlePathNodeIdsToTarget(validated, failedActionGraphNodeId);
  if (!pathIds) return null;

  const { nodesById, outgoing } = validated;
  for (const nodeId of pathIds) {
    const node = nodesById.get(nodeId);
    if (!node) continue;
    if (node.kind === "if") {
      const d = branchDecisions[nodeId];
      if (d !== "true" && d !== "false") {
        return `Cannot resume automation graph: branchDecisions for if node ${nodeId} must be "true" or "false"`;
      }
    } else if (node.kind === "switch") {
      const d = branchDecisions[nodeId];
      if (d == null || d === "") {
        return `Cannot resume automation graph: branchDecisions for switch node ${nodeId} is missing or empty`;
      }
      const outs = outgoing.get(nodeId) ?? [];
      const matches = outs.some((o) => (o.edgeKey ?? "default") === String(d));
      if (!matches) {
        return `Cannot resume automation graph: branchDecisions for switch node ${nodeId} does not match an outgoing edge`;
      }
    }
  }
  return null;
}

function graphEvalRoot(context: RuntimeContext): Record<string, unknown> {
  return {
    ...context.event.payload,
    outputs: context.outputs,
    lastOutput: context.lastOutput,
  };
}

/** Persisted under `stepOutput.__automationGraph` for LIVE graph runs (§8.2). */
function buildLiveGraphStepOutput(
  context: RuntimeContext,
  branchDecisions: Record<string, string>,
  cursorNodeId: string | null,
): Prisma.InputJsonValue {
  const meta: Record<string, unknown> = {
    branchDecisions: { ...branchDecisions },
  };
  if (cursorNodeId != null) {
    meta.cursorNodeId = cursorNodeId;
  }
  return {
    ...context.outputs,
    __automationGraph: meta,
  } as Prisma.InputJsonValue;
}

async function persistLiveGraphRunCheckpoint(
  runId: string,
  context: RuntimeContext,
  branchDecisions: Record<string, string>,
  cursorNodeId: string,
): Promise<void> {
  await automationRepository.updateRun(runId, {
    stepOutput: buildLiveGraphStepOutput(
      context,
      branchDecisions,
      cursorNodeId,
    ),
  });
}

async function finalizeGraphRunSuccess(
  runId: string,
  context: RuntimeContext,
  branchDecisions: Record<string, string>,
) {
  await automationRepository.updateRun(runId, {
    status: "SUCCEEDED",
    stepOutput: buildLiveGraphStepOutput(context, branchDecisions, null),
    completedAt: new Date(),
  });
}

async function runLiveAutomationGraphBody(
  automation: AutomationDefinitionGraph,
  event: AutomationEventPayload,
  runId: string,
  validated: ValidatedFlowGraph,
  resume?: LiveGraphResumeSeed,
): Promise<{ failed: boolean }> {
  const { nodesById, outgoing, entryId } = validated;
  const branchDecisions = resume
    ? { ...resume.branchDecisions }
    : ({} as Record<string, string>);
  const resumeFrozenNodeIds = resume
    ? new Set(Object.keys(resume.branchDecisions))
    : new Set<string>();
  const context: RuntimeContext = resume
    ? resume.context
    : {
        event,
        outputs: {},
        lastOutput: null,
      };
  const existingByNodeId = resume
    ? new Map(resume.existingByNodeId)
    : new Map<
        string,
        {
          runStepId: string;
          status: "RUNNING" | "SUCCEEDED" | "FAILED" | "SKIPPED";
        }
      >();

  async function persistGraphFailureState(
    message: string,
    opts?: { failedActionNodeId?: string },
  ): Promise<void> {
    await automationRepository.updateRun(runId, {
      status: "FAILED",
      errorMessage: message,
      stepOutput: buildLiveGraphStepOutput(
        context,
        branchDecisions,
        opts?.failedActionNodeId ?? null,
      ),
      completedAt: new Date(),
    });
  }

  async function failGraphRun(message: string): Promise<{ failed: true }> {
    await persistGraphFailureState(message);
    return { failed: true };
  }

  let currentId = entryId;
  let visits = 0;
  const cap = MAX_AUTOMATION_FLOW_GRAPH_NODES * 2;

  while (true) {
    if (++visits > cap) {
      return await failGraphRun("Automation graph exceeded visit safety cap");
    }

    const node = nodesById.get(currentId);
    if (!node) {
      return await failGraphRun(`Unknown graph node: ${currentId}`);
    }

    if (node.kind === "entry" || node.kind === "noop") {
      const outs = outgoing.get(currentId) ?? [];
      if (outs.length === 0) {
        await finalizeGraphRunSuccess(runId, context, branchDecisions);
        return { failed: false };
      }
      currentId = outs[0]!.toNodeId;
      continue;
    }

    if (node.kind === "if") {
      const outs = outgoing.get(currentId) ?? [];
      let key: string;
      if (resumeFrozenNodeIds.has(node.id)) {
        const frozen = branchDecisions[node.id];
        if (frozen !== "true" && frozen !== "false") {
          return await failGraphRun(
            `if node ${node.id}: invalid frozen branch for resume`,
          );
        }
        key = frozen;
      } else {
        const root = graphEvalRoot(context);
        const pass = node.config.conditions.every((c) =>
          evaluateCondition(root, c as AutomationCondition),
        );
        key = pass ? "true" : "false";
        branchDecisions[node.id] = key;
      }
      const edge = outs.find((o) => o.edgeKey === key);
      if (!edge) {
        return await failGraphRun(`if node ${node.id} missing "${key}" edge`);
      }
      currentId = edge.toNodeId;
      if (!resumeFrozenNodeIds.has(node.id)) {
        const nextNode = nodesById.get(currentId);
        if (nextNode?.kind !== "action") {
          await persistLiveGraphRunCheckpoint(
            runId,
            context,
            branchDecisions,
            currentId,
          );
        }
      }
      continue;
    }

    if (node.kind === "switch") {
      const outs = outgoing.get(currentId) ?? [];
      let picked: (typeof outs)[number] | undefined;

      if (resumeFrozenNodeIds.has(node.id)) {
        const frozenKey = branchDecisions[node.id];
        if (frozenKey == null || frozenKey === "") {
          await automationRepository.updateRun(runId, {
            status: "FAILED",
            errorMessage: `switch node ${node.id}: missing frozen branch for resume`,
            completedAt: new Date(),
          });
          return { failed: true };
        }
        picked = outs.find(
          (o) => (o.edgeKey ?? "default") === String(frozenKey),
        );
        if (!picked) {
          await automationRepository.updateRun(runId, {
            status: "FAILED",
            errorMessage: `switch node ${node.id}: resume could not resolve frozen branch`,
            completedAt: new Date(),
          });
          return { failed: true };
        }
      } else {
        const root = graphEvalRoot(context);
        const disc = getPathValue(root, node.config.discriminantPath);
        if (disc !== null && typeof disc === "object") {
          return await failGraphRun("Switch discriminant must be a scalar");
        }
        const strDisc = String(disc);
        picked = outs.find(
          (o) =>
            o.edgeKey != null &&
            o.edgeKey !== "default" &&
            String(o.edgeKey) === strDisc,
        );
        if (!picked) picked = outs.find((o) => o.edgeKey === "default");
        if (!picked) {
          return await failGraphRun(
            `switch node ${node.id} has no matching edge`,
          );
        }
      }
      branchDecisions[node.id] = picked.edgeKey ?? "default";
      currentId = picked.toNodeId;
      if (!resumeFrozenNodeIds.has(node.id)) {
        const nextNode = nodesById.get(currentId);
        if (nextNode?.kind !== "action") {
          await persistLiveGraphRunCheckpoint(
            runId,
            context,
            branchDecisions,
            currentId,
          );
        }
      }
      continue;
    }

    if (node.kind === "action") {
      const actionType = node.config.actionType;
      const continueOnError = node.config.continueOnError ?? false;
      const prev = existingByNodeId.get(node.id);
      let runStepId: string;

      if (prev && (prev.status === "FAILED" || prev.status === "RUNNING")) {
        runStepId = prev.runStepId;
        await automationRepository.updateRunStep(runStepId, {
          status: "RUNNING",
          errorMessage: null,
          completedAt: null,
        });
      } else if (prev?.status === "SUCCEEDED") {
        const outs = outgoing.get(currentId) ?? [];
        if (outs.length !== 1) {
          return await failGraphRun(
            `action node ${node.id} must have exactly one outgoing edge`,
          );
        }
        currentId = outs[0]!.toNodeId;
        continue;
      } else if (!prev) {
        const created =
          await automationRepository.createGraphActionRunStepWithCheckpoint({
            runId,
            stepOutput: buildLiveGraphStepOutput(
              context,
              branchDecisions,
              node.id,
            ),
            graphNodeId: node.id,
          });
        runStepId = created.id;
      } else {
        const outs = outgoing.get(currentId) ?? [];
        if (outs.length !== 1) {
          return await failGraphRun(
            `action node ${node.id} must have exactly one outgoing edge`,
          );
        }
        currentId = outs[0]!.toNodeId;
        continue;
      }

      try {
        if (!isActionAllowedForEvent(actionType, event.eventName)) {
          throw new Error(
            `Action "${actionType}" cannot run for "${event.eventName}"`,
          );
        }
        const parsedConfig = parseAutomationActionConfig(
          actionType as never,
          node.config.actionConfig,
        );
        const handler = actionHandlers[actionType];
        if (!handler) {
          throw new Error(`No handler registered for "${actionType}"`);
        }
        const output = await handler({
          automation,
          config: parsedConfig,
          context,
          runId,
        });
        context.outputs[node.id] = output ?? null;
        context.lastOutput = output ?? null;
        await automationRepository.updateRunStep(runStepId, {
          status: "SUCCEEDED",
          output: (output as Prisma.InputJsonValue | undefined) ?? null,
          completedAt: new Date(),
        });
        existingByNodeId.set(node.id, { runStepId, status: "SUCCEEDED" });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Automation step execution failed";
        await automationRepository.updateRunStep(runStepId, {
          status: "FAILED",
          errorMessage: message,
          completedAt: new Date(),
        });
        existingByNodeId.set(node.id, { runStepId, status: "FAILED" });
        if (!continueOnError) {
          await persistGraphFailureState(message, {
            failedActionNodeId: node.id,
          });
          if (error instanceof AutomationProcessingError) {
            throw error;
          }
          return { failed: true };
        }
      }

      const outs = outgoing.get(currentId) ?? [];
      if (outs.length === 0) {
        await finalizeGraphRunSuccess(runId, context, branchDecisions);
        return { failed: false };
      }
      if (outs.length !== 1) {
        return await failGraphRun(
          `action node ${node.id} must have exactly one outgoing edge`,
        );
      }
      const nextAfterAction = outs[0]!.toNodeId;
      await persistLiveGraphRunCheckpoint(
        runId,
        context,
        branchDecisions,
        nextAfterAction,
      );
      currentId = nextAfterAction;
      continue;
    }

    return await failGraphRun("Unsupported graph node");
  }
}

async function runShadowAutomationGraph(
  automation: AutomationDefinitionGraph,
  event: AutomationEventPayload,
  runId: string,
  validated: ValidatedFlowGraph,
): Promise<void> {
  const { nodesById, outgoing, entryId } = validated;
  const branchDecisions: Record<string, string> = {};
  const shadowOutputs: Record<string, unknown> = {};
  const context: RuntimeContext = {
    event,
    outputs: shadowOutputs,
    lastOutput: null,
  };
  let currentId = entryId;
  let visits = 0;
  const cap = MAX_AUTOMATION_FLOW_GRAPH_NODES * 2;

  while (true) {
    if (++visits > cap) break;
    const node = nodesById.get(currentId);
    if (!node) break;

    if (node.kind === "entry" || node.kind === "noop") {
      const outs = outgoing.get(currentId) ?? [];
      if (outs.length === 0) break;
      currentId = outs[0]!.toNodeId;
      continue;
    }

    if (node.kind === "if") {
      const root = graphEvalRoot(context);
      const pass = node.config.conditions.every((c) =>
        evaluateCondition(root, c as AutomationCondition),
      );
      const key = pass ? "true" : "false";
      branchDecisions[node.id] = key;
      const outs = outgoing.get(currentId) ?? [];
      const edge = outs.find((o) => o.edgeKey === key);
      if (!edge) break;
      currentId = edge.toNodeId;
      continue;
    }

    if (node.kind === "switch") {
      const root = graphEvalRoot(context);
      const disc = getPathValue(root, node.config.discriminantPath);
      if (disc !== null && typeof disc === "object") break;
      const strDisc = String(disc);
      const outs = outgoing.get(currentId) ?? [];
      let picked = outs.find(
        (o) =>
          o.edgeKey != null &&
          o.edgeKey !== "default" &&
          String(o.edgeKey) === strDisc,
      );
      if (!picked) picked = outs.find((o) => o.edgeKey === "default");
      if (!picked) break;
      branchDecisions[node.id] = picked.edgeKey ?? "default";
      currentId = picked.toNodeId;
      continue;
    }

    if (node.kind === "action") {
      const parsedConfig = parseAutomationActionConfig(
        node.config.actionType as never,
        node.config.actionConfig,
      );
      const renderedConfig = renderTemplateValue(parsedConfig, context);
      const preview = buildShadowStepPreview(
        node.config.actionType,
        renderedConfig,
      );
      shadowOutputs[node.id] = preview;
      await automationRepository.createRunStep({
        automationRunId: runId,
        automationStepId: null,
        graphNodeId: node.id,
        status: "SKIPPED",
        output: preview as Prisma.InputJsonValue,
        errorMessage: "Shadow mode: side effects were not executed",
      });
      const outs = outgoing.get(currentId) ?? [];
      if (outs.length === 0) break;
      if (outs.length !== 1) break;
      currentId = outs[0]!.toNodeId;
      continue;
    }
    break;
  }

  await automationRepository.updateRun(runId, {
    status: "SKIPPED",
    errorMessage: "Shadow mode: side effects were not executed",
    stepOutput: {
      ...shadowOutputs,
      __automationGraph: { branchDecisions },
    } as Prisma.InputJsonValue,
    completedAt: new Date(),
  });
}

async function runShadowAutomation(
  automation: AutomationDefinitionGraph,
  event: AutomationEventPayload,
  runId: string,
): Promise<void> {
  const validatedGraph = parseValidatedFlowGraphFromDb(automation.flowGraph);
  if (validatedGraph) {
    await runShadowAutomationGraph(automation, event, runId, validatedGraph);
    return;
  }

  const shadowOutputs: Record<string, unknown> = {};
  const context: RuntimeContext = {
    event,
    outputs: shadowOutputs,
    lastOutput: null,
  };

  for (const step of sortAutomationSteps(automation)) {
    const parsedConfig = parseAutomationActionConfig(
      step.actionType as never,
      step.actionConfig,
    );
    const renderedConfig = renderTemplateValue(parsedConfig, context);
    const preview = buildShadowStepPreview(step.actionType, renderedConfig);
    shadowOutputs[step.id] = preview;
    await automationRepository.createRunStep({
      automationRunId: runId,
      automationStepId: step.id,
      status: "SKIPPED",
      output: preview as Prisma.InputJsonValue,
      errorMessage: "Shadow mode: side effects were not executed",
    });
  }

  await automationRepository.updateRun(runId, {
    status: "SKIPPED",
    errorMessage: "Shadow mode: side effects were not executed",
    stepOutput: shadowOutputs as Prisma.InputJsonValue,
    completedAt: new Date(),
  });
}

async function runLiveAutomationSteps(
  automation: AutomationDefinitionGraph,
  event: AutomationEventPayload,
  runId: string,
  sortedSteps: AutomationDefinitionGraph["steps"],
  context: RuntimeContext,
  startIndex: number,
  existingByStepId: Map<
    string,
    {
      runStepId: string;
      status: "RUNNING" | "SUCCEEDED" | "FAILED" | "SKIPPED";
    }
  >,
): Promise<{ failed: boolean }> {
  let failed = false;

  for (let idx = startIndex; idx < sortedSteps.length; idx++) {
    const step = sortedSteps[idx];
    const prev = existingByStepId.get(step.id);
    let runStepId: string;

    if (prev && (prev.status === "FAILED" || prev.status === "RUNNING")) {
      runStepId = prev.runStepId;
      await automationRepository.updateRunStep(runStepId, {
        status: "RUNNING",
        errorMessage: null,
        completedAt: null,
      });
    } else if (!prev) {
      const created = await automationRepository.createRunStep({
        automationRunId: runId,
        automationStepId: step.id,
        status: "RUNNING",
      });
      runStepId = created.id;
    } else {
      continue;
    }

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
        runId,
      });

      context.outputs[step.id] = output ?? null;
      context.lastOutput = output ?? null;

      await automationRepository.updateRunStep(runStepId, {
        status: "SUCCEEDED",
        output: (output as Prisma.InputJsonValue | undefined) ?? null,
        completedAt: new Date(),
      });
      existingByStepId.set(step.id, { runStepId, status: "SUCCEEDED" });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Automation step execution failed";
      await automationRepository.updateRunStep(runStepId, {
        status: "FAILED",
        errorMessage: message,
        completedAt: new Date(),
      });
      existingByStepId.set(step.id, { runStepId, status: "FAILED" });

      if (!step.continueOnError) {
        failed = true;
        await automationRepository.updateRun(runId, {
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

  return { failed };
}

async function runMatchedAutomation(
  automation: AutomationDefinitionGraph,
  event: AutomationEventPayload,
  dedupeKey: string | null,
): Promise<void> {
  const validatedGraph = parseValidatedFlowGraphFromDb(automation.flowGraph);
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
    dedupeKey,
    triggerPayload: event.payload as Prisma.InputJsonValue,
    ...(validatedGraph != null && automation.flowGraph != null
      ? { flowGraphSnapshot: automation.flowGraph as Prisma.InputJsonValue }
      : {}),
  });
  if (!run || run.status !== "RUNNING") {
    return;
  }

  if (automation.executionMode === "SHADOW") {
    await runShadowAutomation(automation, event, run.id);
    emitRunUpdate(event.tenantId, run.id, automation.id, "SKIPPED");
    return;
  }

  if (validatedGraph) {
    const { failed } = await runLiveAutomationGraphBody(
      automation,
      event,
      run.id,
      validatedGraph,
    );
    emitRunUpdate(
      event.tenantId,
      run.id,
      automation.id,
      failed ? "FAILED" : "SUCCEEDED",
    );
    return;
  }

  const sortedSteps = sortAutomationSteps(automation);
  const context: RuntimeContext = {
    event,
    outputs: {},
    lastOutput: null,
  };
  const existingByStepId = new Map<
    string,
    {
      runStepId: string;
      status: "RUNNING" | "SUCCEEDED" | "FAILED" | "SKIPPED";
    }
  >();

  const { failed } = await runLiveAutomationSteps(
    automation,
    event,
    run.id,
    sortedSteps,
    context,
    0,
    existingByStepId,
  );

  if (!failed) {
    await automationRepository.updateRun(run.id, {
      status: "SUCCEEDED",
      stepOutput: context.outputs as Prisma.InputJsonValue,
      completedAt: new Date(),
    });
  }
  emitRunUpdate(
    event.tenantId,
    run.id,
    automation.id,
    failed ? "FAILED" : "SUCCEEDED",
  );
}

export async function resumeFailedAutomationRunsForEvent(
  tenantId: string,
  automationEventId: string,
): Promise<number> {
  if (!automationFeatureEnabled) return 0;

  const runs = await automationRepository.findFailedLiveRunsForEventReplay(
    tenantId,
    automationEventId,
  );

  let resumed = 0;

  for (const run of runs) {
    if (!run.automation || run.automation.status !== "ACTIVE") continue;
    if (!run.automationEventId) continue;

    const eventRow = await automationRepository.findEventById(
      run.automationEventId,
    );
    if (!eventRow || eventRow.tenantId !== tenantId) continue;

    const event = eventRowToPayload(eventRow);

    const graphSourceForResume =
      run.flowGraphSnapshot ?? run.automation.flowGraph;
    if (graphSourceForResume) {
      const validatedGraph =
        parseValidatedFlowGraphFromDb(graphSourceForResume);
      if (!validatedGraph) continue;

      const rawOutput =
        run.stepOutput != null &&
        typeof run.stepOutput === "object" &&
        !Array.isArray(run.stepOutput)
          ? (run.stepOutput as Record<string, unknown>)
          : {};
      const graphMeta = rawOutput.__automationGraph as
        | { branchDecisions?: Record<string, string> }
        | undefined;
      const persistedBranchDecisions = {
        ...(graphMeta?.branchDecisions ?? {}),
      };

      const outputs: Record<string, unknown> = {};
      let lastOutput: unknown = null;
      const existingByNodeId = new Map<
        string,
        {
          runStepId: string;
          status: "RUNNING" | "SUCCEEDED" | "FAILED" | "SKIPPED";
        }
      >();

      let hasResumableGraphAction = false;
      for (const rs of run.runSteps) {
        if (!rs.graphNodeId) continue;
        existingByNodeId.set(rs.graphNodeId, {
          runStepId: rs.id,
          status: rs.status,
        });
        if (rs.status === "SUCCEEDED") {
          outputs[rs.graphNodeId] =
            rs.output != null ? (rs.output as unknown) : null;
          lastOutput = rs.output ?? null;
        }
        if (rs.status === "FAILED" || rs.status === "RUNNING") {
          hasResumableGraphAction = true;
        }
      }

      if (!hasResumableGraphAction) continue;

      const failedGraphActionId = run.runSteps.find(
        (rs) =>
          rs.graphNodeId != null &&
          rs.graphNodeId !== "" &&
          (rs.status === "FAILED" || rs.status === "RUNNING"),
      )?.graphNodeId;

      if (failedGraphActionId) {
        const branchResumeErr = validatePersistedBranchDecisionsForGraphResume(
          validatedGraph,
          failedGraphActionId,
          persistedBranchDecisions,
        );
        if (branchResumeErr) {
          await automationRepository.updateRun(run.id, {
            status: "FAILED",
            errorMessage: branchResumeErr,
            completedAt: new Date(),
          });
          continue;
        }
      }

      await automationRepository.updateRun(run.id, {
        status: "RUNNING",
        completedAt: null,
        errorMessage: null,
        stepOutput: {
          ...outputs,
          __automationGraph: { branchDecisions: persistedBranchDecisions },
        } as Prisma.InputJsonValue,
      });

      const graphContext: RuntimeContext = {
        event,
        outputs,
        lastOutput,
      };

      await runLiveAutomationGraphBody(
        run.automation,
        event,
        run.id,
        validatedGraph,
        {
          branchDecisions: persistedBranchDecisions,
          context: graphContext,
          existingByNodeId,
        },
      );

      resumed += 1;
      continue;
    }

    const sortedSteps = sortAutomationSteps(run.automation);

    const existingByStepId = new Map<
      string,
      {
        runStepId: string;
        status: "RUNNING" | "SUCCEEDED" | "FAILED" | "SKIPPED";
      }
    >();

    const outputs: Record<string, unknown> = {};
    let lastOutput: unknown = null;

    for (const st of sortedSteps) {
      const rs = run.runSteps.find((r) => r.automationStepId === st.id);
      if (rs) {
        existingByStepId.set(st.id, {
          runStepId: rs.id,
          status: rs.status,
        });
        if (rs.status === "SUCCEEDED") {
          outputs[st.id] = rs.output != null ? (rs.output as unknown) : null;
          lastOutput = rs.output ?? null;
        }
      }
    }

    const startIdx = sortedSteps.findIndex((st) => {
      const rs = existingByStepId.get(st.id);
      return !rs || rs.status === "FAILED" || rs.status === "RUNNING";
    });

    if (startIdx === -1) continue;

    await automationRepository.updateRun(run.id, {
      status: "RUNNING",
      completedAt: null,
      errorMessage: null,
      stepOutput: outputs as Prisma.InputJsonValue,
    });

    const context: RuntimeContext = {
      event,
      outputs,
      lastOutput,
    };

    const { failed } = await runLiveAutomationSteps(
      run.automation,
      event,
      run.id,
      sortedSteps,
      context,
      startIdx,
      existingByStepId,
    );

    if (!failed) {
      await automationRepository.updateRun(run.id, {
        status: "SUCCEEDED",
        stepOutput: context.outputs as Prisma.InputJsonValue,
        completedAt: new Date(),
      });
    }

    resumed += 1;
  }

  return resumed;
}

export async function processDueDelayedAutomationRuns(
  limit = AUTOMATION_RETRY_SWEEP_LIMIT,
): Promise<number> {
  if (!automationFeatureEnabled) return 0;

  const now = new Date();
  const due = await automationRepository.findDueDelayedRuns(now, limit);
  let processed = 0;

  for (const row of due) {
    const claimed = await automationRepository.claimDelayedRun(row.id);
    if (!claimed) continue;

    try {
      const eventRow = await automationRepository.findEventById(
        row.automationEventId,
      );
      if (!eventRow || eventRow.tenantId !== row.tenantId) {
        await automationRepository.completeDelayedRun(row.id);
        continue;
      }

      const automation = await automationRepository.findDefinitionById(
        row.tenantId,
        row.automationDefinitionId,
      );
      if (!automation || automation.status !== "ACTIVE") {
        await automationRepository.completeDelayedRun(row.id);
        continue;
      }

      const trigger = automation.triggers.find(
        (t) => t.id === row.automationTriggerId,
      );
      if (!trigger || trigger.delayMinutes <= 0) {
        await automationRepository.completeDelayedRun(row.id);
        continue;
      }

      const event = eventRowToPayload(eventRow);
      if (
        trigger.eventName !== event.eventName ||
        !matchesConditions(event.payload, trigger.conditionGroups)
      ) {
        await automationRepository.completeDelayedRun(row.id);
        continue;
      }

      const dedupeKey = `delay:${event.id}:${automation.id}:${trigger.id}`;
      await runMatchedAutomation(automation, event, dedupeKey);
      await automationRepository.completeDelayedRun(row.id);
      processed += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Delayed automation failed";
      await automationRepository.failDelayedRun(row.id, message);
    }
  }

  return processed;
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
    case "in": {
      const list = normalizeInConditionValue(condition.value);
      return list != null ? list.includes(actual) : false;
    }
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
  "crm.contact.add_tag": async ({ config, context }) => {
    const parsed = renderTemplateValue(
      config,
      context,
    ) as CrmContactAddTagActionConfig;
    const contactId = renderTemplateString(parsed.contactIdTemplate, context);
    const existing = await basePrisma.contactTag.findFirst({
      where: { tenantId: context.event.tenantId, name: parsed.tagName },
      select: { id: true, name: true },
    });
    const tag =
      existing ??
      (await basePrisma.contactTag.create({
        data: { tenantId: context.event.tenantId, name: parsed.tagName },
        select: { id: true, name: true },
      }));
    await basePrisma.contactTagLink.upsert({
      where: { contactId_tagId: { contactId, tagId: tag.id } },
      create: { contactId, tagId: tag.id },
      update: {},
    });
    return { contactId, tagId: tag.id, tagName: tag.name };
  },
  "crm.contact.add_note": async ({ config, context }) => {
    const parsed = renderTemplateValue(
      config,
      context,
    ) as CrmContactAddNoteActionConfig;
    const contactId = renderTemplateString(parsed.contactIdTemplate, context);
    const createdById = await resolveExistingActorUserId(
      context.event.tenantId,
      context.event.actorUserId,
    );
    if (!createdById) {
      return { skipped: true, reason: "No valid actor for contact note" };
    }
    const note = await basePrisma.contactNote.create({
      data: { contactId, content: parsed.content.trim(), createdById },
      select: { id: true },
    });
    return { contactId, noteId: note.id };
  },
  "crm.deal.create": async ({ config, context }) => {
    const parsed = renderTemplateValue(
      config,
      context,
    ) as CrmDealCreateActionConfig;
    const actorUserId = await resolveExistingActorUserId(
      context.event.tenantId,
      context.event.actorUserId,
    );
    if (!actorUserId) {
      return { skipped: true, reason: "No valid actor for deal creation" };
    }
    const contactId = parsed.contactIdTemplate
      ? renderTemplateString(parsed.contactIdTemplate, context)
      : null;
    const assignedToId = parsed.assignedToIdTemplate
      ? renderTemplateString(parsed.assignedToIdTemplate, context)
      : actorUserId;
    const resolvedAssignee = await resolveAssignableUserId(
      context.event.tenantId,
      assignedToId,
    );
    const deal = await basePrisma.deal.create({
      data: {
        tenantId: context.event.tenantId,
        name: parsed.name,
        value: parsed.amount ?? 0,
        pipelineId: parsed.pipelineId,
        stage: parsed.stage ?? "Qualification",
        status: "OPEN",
        probability: 0,
        contactId: contactId || null,
        assignedToId: resolvedAssignee ?? actorUserId,
        createdById: actorUserId,
      },
      select: { id: true, name: true, stage: true },
    });
    return { dealId: deal.id, name: deal.name, stage: deal.stage };
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
    await automationEventQueue
      .add("process-event", { eventId: event.id })
      .catch((err: unknown) => {
        logger.warn(
          "BullMQ enqueue failed, falling back to setImmediate",
          undefined,
          {
            eventId: event.id,
            error: err instanceof Error ? err.message : String(err),
          },
        );
        setImmediate(() => void processAutomationEventById(event.id));
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

      if (matchingTrigger.delayMinutes > 0) {
        const fireAt = new Date(
          Date.now() + matchingTrigger.delayMinutes * 60 * 1000,
        );
        try {
          await automationRepository.createDelayedRun({
            tenantId: event.tenantId,
            automationEventId: event.id,
            automationDefinitionId: automation.id,
            automationTriggerId: matchingTrigger.id,
            fireAt,
          });
        } catch (error) {
          const code = (error as { code?: string })?.code;
          if (code === "P2002") {
            continue;
          }
          throw error;
        }
        continue;
      }

      const dedupeKey = event.dedupeKey
        ? `${event.dedupeKey}:${automation.id}`
        : null;
      await runMatchedAutomation(automation, event, dedupeKey);
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

export async function testAutomationDefinition(
  tenantId: string,
  automationId: string,
  input: { eventName: string; payload: Record<string, unknown> },
): Promise<{ runId: string }> {
  if (!automationFeatureEnabled) {
    throw new Error("Automation feature is not enabled");
  }

  const automation = await automationRepository.findDefinitionById(
    tenantId,
    automationId,
  );
  if (!automation) {
    throw Object.assign(new Error("Automation not found"), { statusCode: 404 });
  }

  const syntheticDedupeKey = `test:${automationId}:${Date.now()}`;
  const now = new Date();
  const event = await automationRepository.createEvent({
    tenantId,
    eventName: input.eventName,
    entityType: "TEST",
    entityId: `test-${Date.now()}`,
    payload: input.payload as Prisma.InputJsonValue,
    actorUserId: null,
    dedupeKey: syntheticDedupeKey,
    scopeType: null,
    scopeId: null,
    occurredAt: now,
  });
  await automationRepository.markEventProcessed(event.id);

  const syntheticEvent: AutomationEventPayload = {
    id: event.id,
    tenantId,
    eventName: input.eventName,
    scopeType: null,
    scopeId: null,
    entityType: "TEST",
    entityId: event.entityId,
    actorUserId: null,
    dedupeKey: syntheticDedupeKey,
    payload: input.payload,
    occurredAt: event.occurredAt,
  };

  const shadowAutomation = { ...automation, executionMode: "SHADOW" as const };
  const run = await createRunSafely({
    tenantId,
    automationId: automation.id,
    automationEventId: event.id,
    status: "RUNNING",
    executionMode: "SHADOW",
    eventName: input.eventName,
    entityType: "TEST",
    entityId: event.entityId,
    actorUserId: null,
    dedupeKey: null,
    triggerPayload: input.payload as Prisma.InputJsonValue,
  });

  if (!run || run.status !== "RUNNING") {
    throw new Error("Could not create test run");
  }

  await runShadowAutomation(shadowAutomation, syntheticEvent, run.id);
  emitRunUpdate(tenantId, run.id, automation.id, "SKIPPED");

  return { runId: run.id };
}

declare global {
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
  void processDueDelayedAutomationRuns().catch((error) => {
    logger.error("Initial automation delayed-run sweep failed", undefined, {
      error: error instanceof Error ? error.message : String(error),
    });
  });
  const timer = setInterval(() => {
    void processDueAutomationEvents().catch((error) => {
      logger.error("Automation retry sweep failed", undefined, {
        error: error instanceof Error ? error.message : String(error),
      });
    });
    void processDueDelayedAutomationRuns().catch((error) => {
      logger.error("Automation delayed-run sweep failed", undefined, {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }, AUTOMATION_RETRY_INTERVAL_MS);
  timer.unref();
}
