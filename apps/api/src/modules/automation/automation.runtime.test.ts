import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindEventById = vi.fn();
const mockClaimEventForProcessing = vi.fn();
const mockFindMatchingDefinitions = vi.fn();
const mockCreateRun = vi.fn();
const mockFindRunByDedupeKey = vi.fn();
const mockCreateRunStep = vi.fn();
const mockUpdateRun = vi.fn();
const mockUpdateRunStep = vi.fn();
const mockMarkEventProcessed = vi.fn();
const mockMarkEventFailed = vi.fn();
const mockMarkEventExhausted = vi.fn();
const mockCreateDelayedRun = vi.fn();
const mockFindActiveAutoDraftTransferBySignal = vi.fn();
const mockCreateTransfer = vi.fn();
const mockCreateTransferLog = vi.fn();
const mockUserFindFirst = vi.fn();
const mockContactUpdate = vi.fn();
const mockCompanyUpdate = vi.fn();
const mockCreateWorkItem = vi.fn();
const mockFindFailedLiveRunsForEventReplay = vi.fn();

vi.mock("@/config/env", () => ({
  env: {
    appEnv: "development",
    featureFlags: "AUTOMATION",
  },
}));

vi.mock("@/config/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@/config/prisma", () => ({
  basePrisma: {
    user: {
      findFirst: (...args: unknown[]) => mockUserFindFirst(...args),
    },
    contact: {
      update: (...args: unknown[]) => mockContactUpdate(...args),
    },
    company: {
      update: (...args: unknown[]) => mockCompanyUpdate(...args),
    },
  },
}));

vi.mock("@/modules/notifications/notification.repository", () => ({
  default: { create: vi.fn() },
}));

vi.mock("@/modules/transfers/transfer.repository", () => ({
  default: {
    findActiveAutoDraftTransferBySignal: (...args: unknown[]) =>
      mockFindActiveAutoDraftTransferBySignal(...args),
    createTransfer: (...args: unknown[]) => mockCreateTransfer(...args),
    createTransferLog: (...args: unknown[]) => mockCreateTransferLog(...args),
  },
}));

vi.mock("@/modules/activities/activity.repository", () => ({
  default: { create: vi.fn() },
}));

vi.mock("@/modules/deals/deal.service", () => ({
  default: {
    updateStageFromAutomation: vi.fn(),
  },
}));

vi.mock("./automation.repository", () => ({
  default: {
    findEventById: (...args: unknown[]) => mockFindEventById(...args),
    claimEventForProcessing: (...args: unknown[]) =>
      mockClaimEventForProcessing(...args),
    findMatchingDefinitions: (...args: unknown[]) =>
      mockFindMatchingDefinitions(...args),
    createRun: (...args: unknown[]) => mockCreateRun(...args),
    findRunByDedupeKey: (...args: unknown[]) => mockFindRunByDedupeKey(...args),
    createRunStep: (...args: unknown[]) => mockCreateRunStep(...args),
    updateRun: (...args: unknown[]) => mockUpdateRun(...args),
    updateRunStep: (...args: unknown[]) => mockUpdateRunStep(...args),
    markEventProcessed: (...args: unknown[]) => mockMarkEventProcessed(...args),
    markEventFailed: (...args: unknown[]) => mockMarkEventFailed(...args),
    markEventExhausted: (...args: unknown[]) => mockMarkEventExhausted(...args),
    findRetryableEventIds: vi.fn(),
    createDelayedRun: (...args: unknown[]) => mockCreateDelayedRun(...args),
    findDueDelayedRuns: vi.fn().mockResolvedValue([]),
    claimDelayedRun: vi.fn().mockResolvedValue(true),
    completeDelayedRun: vi.fn(),
    failDelayedRun: vi.fn(),
    findDefinitionById: vi.fn(),
    findFailedLiveRunsForEventReplay: (...args: unknown[]) =>
      mockFindFailedLiveRunsForEventReplay(...args),
    createWorkItem: (...args: unknown[]) => mockCreateWorkItem(...args),
  },
}));

import { compileLinearStepsToFlowGraph } from "@repo/shared";

import {
  processAutomationEventById,
  resumeFailedAutomationRunsForEvent,
} from "./automation.runtime";

const baseEvent = {
  id: "event-1",
  tenantId: "tenant-1",
  eventName: "inventory.stock.low_detected",
  scopeType: "LOCATION",
  scopeId: "loc-1",
  entityType: "INVENTORY_SIGNAL",
  entityId: "signal-1",
  actorUserId: "user-1",
  dedupeKey: "signal:event-1",
  payload: {
    signalId: "signal-1",
    suggestedTransfer: {
      fromLocationId: "loc-warehouse",
      toLocationId: "loc-1",
      notes: "Restock",
      items: [{ variationId: "var-1", quantity: 2 }],
    },
  },
  occurredAt: new Date("2026-04-02T00:00:00.000Z"),
  attempts: 1,
  status: "PENDING",
};

describe("automation.runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindEventById.mockResolvedValue(baseEvent);
    mockClaimEventForProcessing.mockResolvedValue(true);
    mockCreateRun.mockResolvedValue({ id: "run-1", status: "RUNNING" });
    mockCreateRunStep.mockResolvedValue({ id: "run-step-1" });
    mockUserFindFirst.mockResolvedValue({ id: "user-1" });
    mockContactUpdate.mockResolvedValue({ id: "contact-1" });
    mockCompanyUpdate.mockResolvedValue({ id: "company-1" });
    mockCreateDelayedRun.mockResolvedValue({ id: "delayed-1" });
    mockCreateWorkItem.mockResolvedValue({ id: "wi-1" });
    mockFindFailedLiveRunsForEventReplay.mockResolvedValue([]);
  });

  it("enqueues delayed automation instead of running immediately", async () => {
    mockFindMatchingDefinitions.mockResolvedValue([
      {
        id: "auto-1",
        executionMode: "LIVE",
        triggers: [
          {
            id: "trigger-1",
            eventName: "inventory.stock.low_detected",
            conditionGroups: null,
            delayMinutes: 15,
          },
        ],
        steps: [
          {
            id: "step-1",
            actionType: "workitem.create",
            actionConfig: { title: "Later", type: "TASK", priority: "HIGH" },
            continueOnError: false,
          },
        ],
      },
    ]);

    await processAutomationEventById("event-1");

    expect(mockCreateDelayedRun).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        automationEventId: "event-1",
        automationDefinitionId: "auto-1",
        automationTriggerId: "trigger-1",
      }),
    );
    expect(mockCreateDelayedRun.mock.calls[0][0].fireAt).toBeInstanceOf(Date);
    expect(mockCreateRun).not.toHaveBeenCalled();
    expect(mockMarkEventProcessed).toHaveBeenCalledWith("event-1");
  });

  it("records preview outputs for shadow runs", async () => {
    mockFindMatchingDefinitions.mockResolvedValue([
      {
        id: "auto-1",
        executionMode: "SHADOW",
        triggers: [
          {
            id: "trigger-1",
            eventName: "inventory.stock.low_detected",
            conditionGroups: null,
          },
        ],
        steps: [
          {
            id: "step-1",
            actionType: "workitem.create",
            actionConfig: { title: "Restock", type: "TASK", priority: "HIGH" },
            continueOnError: false,
          },
        ],
      },
    ]);

    await processAutomationEventById("event-1");

    expect(mockCreateRun).toHaveBeenCalledWith(
      expect.objectContaining({
        executionMode: "SHADOW",
      }),
    );
    expect(mockCreateRunStep).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "SKIPPED",
        output: expect.objectContaining({
          simulated: true,
          actionType: "workitem.create",
        }),
      }),
    );
    expect(mockUpdateRun).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({
        status: "SKIPPED",
        stepOutput: expect.objectContaining({
          "step-1": expect.objectContaining({ simulated: true }),
        }),
      }),
    );
    expect(mockMarkEventProcessed).toHaveBeenCalledWith("event-1");
  });

  it("executes entity-specific CRM contact update actions", async () => {
    mockFindEventById.mockResolvedValue({
      ...baseEvent,
      eventName: "crm.lead.converted",
      entityType: "LEAD",
      payload: {
        contactId: "contact-1",
      },
    });
    mockFindMatchingDefinitions.mockResolvedValue([
      {
        id: "auto-1",
        executionMode: "LIVE",
        triggers: [
          {
            id: "trigger-1",
            eventName: "crm.lead.converted",
            conditionGroups: null,
          },
        ],
        steps: [
          {
            id: "step-1",
            actionType: "crm.contact.update",
            actionConfig: {
              contactIdTemplate: "{{event.payload.contactId}}",
              field: "status",
              value: "CUSTOMER",
            },
            continueOnError: false,
          },
        ],
      },
    ]);

    await processAutomationEventById("event-1");

    expect(mockContactUpdate).toHaveBeenCalledWith({
      where: { id: "contact-1" },
      data: { status: "CUSTOMER" },
    });
    expect(mockMarkEventProcessed).toHaveBeenCalledWith("event-1");
  });

  it("skips duplicate auto-draft transfers for an active signal", async () => {
    mockFindMatchingDefinitions.mockResolvedValue([
      {
        id: "auto-1",
        executionMode: "LIVE",
        triggers: [
          {
            id: "trigger-1",
            eventName: "inventory.stock.low_detected",
            conditionGroups: null,
          },
        ],
        steps: [
          {
            id: "step-1",
            actionType: "transfer.create_draft",
            actionConfig: { payloadPath: "suggestedTransfer" },
            continueOnError: false,
          },
        ],
      },
    ]);
    mockFindActiveAutoDraftTransferBySignal.mockResolvedValue({
      id: "transfer-1",
      transferCode: "TRF-1",
      status: "PENDING",
    });

    await processAutomationEventById("event-1");

    expect(mockCreateTransfer).not.toHaveBeenCalled();
    expect(mockUpdateRunStep).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        status: "SUCCEEDED",
        output: expect.objectContaining({
          skipped: true,
          transferId: "transfer-1",
        }),
      }),
    );
  });

  it("retries webhook timeout failures at the event level", async () => {
    mockFindMatchingDefinitions.mockResolvedValue([
      {
        id: "auto-1",
        executionMode: "LIVE",
        triggers: [
          {
            id: "trigger-1",
            eventName: "inventory.stock.low_detected",
            conditionGroups: null,
          },
        ],
        steps: [
          {
            id: "step-1",
            actionType: "webhook.emit",
            actionConfig: { url: "https://example.com/hook", method: "POST" },
            continueOnError: false,
          },
        ],
      },
    ]);

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValue(
          Object.assign(new Error("Timed out"), { name: "TimeoutError" }),
        ),
    );

    await processAutomationEventById("event-1");

    expect(mockUpdateRun).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({
        status: "FAILED",
        errorMessage: expect.stringContaining("Webhook timed out"),
      }),
    );
    expect(mockMarkEventFailed).toHaveBeenCalledWith(
      "event-1",
      expect.stringContaining("Webhook timed out"),
      expect.any(Date),
    );
    expect(mockMarkEventProcessed).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("exhausts non-retryable webhook failures immediately", async () => {
    mockFindMatchingDefinitions.mockResolvedValue([
      {
        id: "auto-1",
        executionMode: "LIVE",
        triggers: [
          {
            id: "trigger-1",
            eventName: "inventory.stock.low_detected",
            conditionGroups: null,
          },
        ],
        steps: [
          {
            id: "step-1",
            actionType: "webhook.emit",
            actionConfig: { url: "https://example.com/hook", method: "POST" },
            continueOnError: false,
          },
        ],
      },
    ]);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: { get: vi.fn().mockReturnValue(null) },
      }),
    );

    await processAutomationEventById("event-1");

    expect(mockMarkEventExhausted).toHaveBeenCalledWith(
      "event-1",
      expect.stringContaining("Webhook failed with status 400"),
    );

    vi.unstubAllGlobals();
  });

  it("uses retry-after headers for rate-limited webhook retries", async () => {
    mockFindMatchingDefinitions.mockResolvedValue([
      {
        id: "auto-1",
        executionMode: "LIVE",
        triggers: [
          {
            id: "trigger-1",
            eventName: "inventory.stock.low_detected",
            conditionGroups: null,
          },
        ],
        steps: [
          {
            id: "step-1",
            actionType: "webhook.emit",
            actionConfig: { url: "https://example.com/hook", method: "POST" },
            continueOnError: false,
          },
        ],
      },
    ]);

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-02T00:00:00.000Z"));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: { get: vi.fn().mockReturnValue("120") },
      }),
    );

    await processAutomationEventById("event-1");

    expect(mockMarkEventFailed).toHaveBeenCalledWith(
      "event-1",
      expect.stringContaining("Webhook failed with status 429"),
      new Date("2026-04-02T00:02:00.000Z"),
    );

    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("exhausts retryable failures once max attempts are reached", async () => {
    mockFindEventById.mockResolvedValue({
      ...baseEvent,
      attempts: 8,
      status: "FAILED",
    });
    mockFindMatchingDefinitions.mockResolvedValue([
      {
        id: "auto-1",
        executionMode: "LIVE",
        triggers: [
          {
            id: "trigger-1",
            eventName: "inventory.stock.low_detected",
            conditionGroups: null,
          },
        ],
        steps: [
          {
            id: "step-1",
            actionType: "webhook.emit",
            actionConfig: { url: "https://example.com/hook", method: "POST" },
            continueOnError: false,
          },
        ],
      },
    ]);

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValue(
          Object.assign(new Error("Timed out"), { name: "TimeoutError" }),
        ),
    );

    await processAutomationEventById("event-1");

    expect(mockMarkEventExhausted).toHaveBeenCalledWith(
      "event-1",
      expect.stringContaining("Webhook timed out"),
    );
    expect(mockMarkEventFailed).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("executes LIVE linear flowGraph and sets graphNodeId on run steps", async () => {
    const entryId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const actionNodeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const flowGraph = compileLinearStepsToFlowGraph(
      [
        {
          actionType: "workitem.create",
          actionConfig: { title: "Graph task", type: "TASK", priority: "HIGH" },
          continueOnError: false,
        },
      ],
      { entryId, actionNodeIds: [actionNodeId] },
    );

    mockFindMatchingDefinitions.mockResolvedValue([
      {
        id: "auto-graph-linear",
        executionMode: "LIVE",
        triggers: [
          {
            id: "trigger-1",
            eventName: "inventory.stock.low_detected",
            conditionGroups: null,
          },
        ],
        steps: [],
        flowGraph,
      },
    ]);

    await processAutomationEventById("event-1");

    expect(mockCreateRunStep).toHaveBeenCalledWith(
      expect.objectContaining({
        automationRunId: "run-1",
        automationStepId: null,
        graphNodeId: actionNodeId,
        status: "RUNNING",
      }),
    );
    expect(mockCreateWorkItem).toHaveBeenCalledTimes(1);
    expect(mockUpdateRun).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({
        status: "SUCCEEDED",
        stepOutput: expect.objectContaining({
          __automationGraph: expect.objectContaining({
            branchDecisions: {},
          }),
        }),
      }),
    );
    expect(mockMarkEventProcessed).toHaveBeenCalledWith("event-1");
  });

  it("executes LIVE if false path without running the true-branch action", async () => {
    const entryId = "10101010-1010-4010-8010-101010101010";
    const ifId = "20202020-2020-4020-8020-202020202020";
    const actionTrueId = "30303030-3030-4030-8030-303030303030";
    const endId = "40404040-4040-4040-8040-404040404040";

    const flowGraph = {
      nodes: [
        { id: entryId, kind: "entry" as const },
        {
          id: ifId,
          kind: "if" as const,
          config: {
            conditions: [
              { path: "runHot", operator: "eq" as const, value: true },
            ],
          },
        },
        {
          id: actionTrueId,
          kind: "action" as const,
          config: {
            actionType: "workitem.create" as const,
            actionConfig: {
              title: "Hot only",
              type: "TASK",
              priority: "HIGH",
            },
          },
        },
        { id: endId, kind: "noop" as const },
      ],
      edges: [
        { fromNodeId: entryId, toNodeId: ifId },
        { fromNodeId: ifId, toNodeId: actionTrueId, edgeKey: "true" },
        { fromNodeId: ifId, toNodeId: endId, edgeKey: "false" },
        { fromNodeId: actionTrueId, toNodeId: endId },
      ],
    };

    mockFindEventById.mockResolvedValue({
      ...baseEvent,
      payload: { ...baseEvent.payload, runHot: false },
    });

    mockFindMatchingDefinitions.mockResolvedValue([
      {
        id: "auto-if-false",
        executionMode: "LIVE",
        triggers: [
          {
            id: "trigger-1",
            eventName: "inventory.stock.low_detected",
            conditionGroups: null,
          },
        ],
        steps: [],
        flowGraph,
      },
    ]);

    await processAutomationEventById("event-1");

    expect(mockCreateWorkItem).not.toHaveBeenCalled();
    expect(mockCreateRunStep).not.toHaveBeenCalled();
    expect(mockUpdateRun).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({
        status: "SUCCEEDED",
        stepOutput: expect.objectContaining({
          __automationGraph: {
            branchDecisions: { [ifId]: "false" },
          },
        }),
      }),
    );
    expect(mockMarkEventProcessed).toHaveBeenCalledWith("event-1");
  });

  it("executes LIVE if true path and records branch decision", async () => {
    const entryId = "50505050-5050-4050-8050-505050505050";
    const ifId = "60606060-6060-4060-8060-606060606060";
    const actionTrueId = "70707070-7070-4070-8070-707070707070";
    const endId = "80808080-8080-4080-8080-808080808080";

    const flowGraph = {
      nodes: [
        { id: entryId, kind: "entry" as const },
        {
          id: ifId,
          kind: "if" as const,
          config: {
            conditions: [
              { path: "runHot", operator: "eq" as const, value: true },
            ],
          },
        },
        {
          id: actionTrueId,
          kind: "action" as const,
          config: {
            actionType: "workitem.create" as const,
            actionConfig: {
              title: "Hot path",
              type: "TASK",
              priority: "HIGH",
            },
          },
        },
        { id: endId, kind: "noop" as const },
      ],
      edges: [
        { fromNodeId: entryId, toNodeId: ifId },
        { fromNodeId: ifId, toNodeId: actionTrueId, edgeKey: "true" },
        { fromNodeId: ifId, toNodeId: endId, edgeKey: "false" },
        { fromNodeId: actionTrueId, toNodeId: endId },
      ],
    };

    mockFindEventById.mockResolvedValue({
      ...baseEvent,
      payload: { ...baseEvent.payload, runHot: true },
    });

    mockFindMatchingDefinitions.mockResolvedValue([
      {
        id: "auto-if-true",
        executionMode: "LIVE",
        triggers: [
          {
            id: "trigger-1",
            eventName: "inventory.stock.low_detected",
            conditionGroups: null,
          },
        ],
        steps: [],
        flowGraph,
      },
    ]);

    await processAutomationEventById("event-1");

    expect(mockCreateRunStep).toHaveBeenCalledWith(
      expect.objectContaining({
        graphNodeId: actionTrueId,
        automationStepId: null,
      }),
    );
    expect(mockCreateWorkItem).toHaveBeenCalledTimes(1);
    expect(mockUpdateRun).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({
        status: "SUCCEEDED",
        stepOutput: expect.objectContaining({
          __automationGraph: {
            branchDecisions: { [ifId]: "true" },
          },
        }),
      }),
    );
  });

  it("records SHADOW preview for linear flowGraph without side effects", async () => {
    const entryId = "c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0";
    const actionNodeId = "c1c1c1c1-c1c1-41c1-81c1-c1c1c1c1c1c1";
    const flowGraph = compileLinearStepsToFlowGraph(
      [
        {
          actionType: "workitem.create",
          actionConfig: {
            title: "Shadow graph",
            type: "TASK",
            priority: "HIGH",
          },
          continueOnError: false,
        },
      ],
      { entryId, actionNodeIds: [actionNodeId] },
    );

    mockFindMatchingDefinitions.mockResolvedValue([
      {
        id: "auto-shadow-linear",
        executionMode: "SHADOW",
        triggers: [
          {
            id: "trigger-1",
            eventName: "inventory.stock.low_detected",
            conditionGroups: null,
          },
        ],
        steps: [],
        flowGraph,
      },
    ]);

    await processAutomationEventById("event-1");

    expect(mockCreateWorkItem).not.toHaveBeenCalled();
    expect(mockCreateRunStep).toHaveBeenCalledWith(
      expect.objectContaining({
        automationRunId: "run-1",
        graphNodeId: actionNodeId,
        automationStepId: null,
        status: "SKIPPED",
        output: expect.objectContaining({ simulated: true }),
      }),
    );
    expect(mockUpdateRun).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({
        status: "SKIPPED",
        stepOutput: expect.objectContaining({
          [actionNodeId]: expect.objectContaining({ simulated: true }),
          __automationGraph: { branchDecisions: {} },
        }),
      }),
    );
    expect(mockMarkEventProcessed).toHaveBeenCalledWith("event-1");
  });

  it("SHADOW if false path records branch decision without sibling action preview", async () => {
    const entryId = "d0d0d0d0-d0d0-40d0-80d0-d0d0d0d0d0d0";
    const ifId = "d1d1d1d1-d1d1-41d1-81d1-d1d1d1d1d1d1";
    const actionTrueId = "d2d2d2d2-d2d2-42d2-82d2-d2d2d2d2d2d2";
    const endId = "d3d3d3d3-d3d3-43d3-83d3-d3d3d3d3d3d3";

    const flowGraph = {
      nodes: [
        { id: entryId, kind: "entry" as const },
        {
          id: ifId,
          kind: "if" as const,
          config: {
            conditions: [
              { path: "flag", operator: "eq" as const, value: true },
            ],
          },
        },
        {
          id: actionTrueId,
          kind: "action" as const,
          config: {
            actionType: "workitem.create" as const,
            actionConfig: {
              title: "Shadow true only",
              type: "TASK",
              priority: "HIGH",
            },
          },
        },
        { id: endId, kind: "noop" as const },
      ],
      edges: [
        { fromNodeId: entryId, toNodeId: ifId },
        { fromNodeId: ifId, toNodeId: actionTrueId, edgeKey: "true" },
        { fromNodeId: ifId, toNodeId: endId, edgeKey: "false" },
        { fromNodeId: actionTrueId, toNodeId: endId },
      ],
    };

    mockFindEventById.mockResolvedValue({
      ...baseEvent,
      payload: { ...baseEvent.payload, flag: false },
    });

    mockFindMatchingDefinitions.mockResolvedValue([
      {
        id: "auto-shadow-if-false",
        executionMode: "SHADOW",
        triggers: [
          {
            id: "trigger-1",
            eventName: "inventory.stock.low_detected",
            conditionGroups: null,
          },
        ],
        steps: [],
        flowGraph,
      },
    ]);

    await processAutomationEventById("event-1");

    expect(mockCreateWorkItem).not.toHaveBeenCalled();
    expect(mockCreateRunStep).not.toHaveBeenCalled();
    expect(mockUpdateRun).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({
        status: "SKIPPED",
        stepOutput: expect.objectContaining({
          __automationGraph: {
            branchDecisions: { [ifId]: "false" },
          },
        }),
      }),
    );
  });

  it("SHADOW if true path previews only the taken branch action", async () => {
    const entryId = "e0e0e0e0-e0e0-40e0-80e0-e0e0e0e0e0e0";
    const ifId = "e1e1e1e1-e1e1-41e1-81e1-e1e1e1e1e1e1";
    const actionTrueId = "e2e2e2e2-e2e2-42e2-82e2-e2e2e2e2e2e2";
    const endId = "e3e3e3e3-e3e3-43e3-83e3-e3e3e3e3e3e3";

    const flowGraph = {
      nodes: [
        { id: entryId, kind: "entry" as const },
        {
          id: ifId,
          kind: "if" as const,
          config: {
            conditions: [
              { path: "flag", operator: "eq" as const, value: true },
            ],
          },
        },
        {
          id: actionTrueId,
          kind: "action" as const,
          config: {
            actionType: "workitem.create" as const,
            actionConfig: {
              title: "Shadow hot",
              type: "TASK",
              priority: "HIGH",
            },
          },
        },
        { id: endId, kind: "noop" as const },
      ],
      edges: [
        { fromNodeId: entryId, toNodeId: ifId },
        { fromNodeId: ifId, toNodeId: actionTrueId, edgeKey: "true" },
        { fromNodeId: ifId, toNodeId: endId, edgeKey: "false" },
        { fromNodeId: actionTrueId, toNodeId: endId },
      ],
    };

    mockFindEventById.mockResolvedValue({
      ...baseEvent,
      payload: { ...baseEvent.payload, flag: true },
    });

    mockFindMatchingDefinitions.mockResolvedValue([
      {
        id: "auto-shadow-if-true",
        executionMode: "SHADOW",
        triggers: [
          {
            id: "trigger-1",
            eventName: "inventory.stock.low_detected",
            conditionGroups: null,
          },
        ],
        steps: [],
        flowGraph,
      },
    ]);

    await processAutomationEventById("event-1");

    expect(mockCreateWorkItem).not.toHaveBeenCalled();
    expect(mockCreateRunStep).toHaveBeenCalledTimes(1);
    expect(mockCreateRunStep).toHaveBeenCalledWith(
      expect.objectContaining({
        graphNodeId: actionTrueId,
        status: "SKIPPED",
        output: expect.objectContaining({ simulated: true }),
      }),
    );
    expect(mockUpdateRun).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({
        stepOutput: expect.objectContaining({
          __automationGraph: {
            branchDecisions: { [ifId]: "true" },
          },
        }),
      }),
    );
  });

  it("executes LIVE switch on matching edge key and records branch decision", async () => {
    const entryId = "f0f0f0f0-f0f0-40f0-80f0-f0f0f0f0f0f0";
    const swId = "f1f1f1f1-f1f1-41f1-81f1-f1f1f1f1f1f1";
    const aEast = "f2f2f2f2-f2f2-42f2-82f2-f2f2f2f2f2f2";
    const aWest = "f3f3f3f3-f3f3-43f3-83f3-f3f3f3f3f3f3";
    const aDefault = "f4f4f4f4-f4f4-44f4-84f4-f4f4f4f4f4f4";

    const flowGraph = {
      nodes: [
        { id: entryId, kind: "entry" as const },
        {
          id: swId,
          kind: "switch" as const,
          config: { discriminantPath: "region" },
        },
        {
          id: aEast,
          kind: "action" as const,
          config: {
            actionType: "workitem.create" as const,
            actionConfig: {
              title: "East branch",
              type: "TASK",
              priority: "HIGH",
            },
          },
        },
        {
          id: aWest,
          kind: "action" as const,
          config: {
            actionType: "workitem.create" as const,
            actionConfig: {
              title: "West branch",
              type: "TASK",
              priority: "HIGH",
            },
          },
        },
        {
          id: aDefault,
          kind: "action" as const,
          config: {
            actionType: "workitem.create" as const,
            actionConfig: {
              title: "Default branch",
              type: "TASK",
              priority: "HIGH",
            },
          },
        },
      ],
      edges: [
        { fromNodeId: entryId, toNodeId: swId },
        { fromNodeId: swId, toNodeId: aEast, edgeKey: "east" },
        { fromNodeId: swId, toNodeId: aWest, edgeKey: "west" },
        { fromNodeId: swId, toNodeId: aDefault, edgeKey: "default" },
      ],
    };

    mockFindEventById.mockResolvedValue({
      ...baseEvent,
      payload: { ...baseEvent.payload, region: "west" },
    });

    mockFindMatchingDefinitions.mockResolvedValue([
      {
        id: "auto-switch-west",
        executionMode: "LIVE",
        triggers: [
          {
            id: "trigger-1",
            eventName: "inventory.stock.low_detected",
            conditionGroups: null,
          },
        ],
        steps: [],
        flowGraph,
      },
    ]);

    await processAutomationEventById("event-1");

    expect(mockCreateWorkItem).toHaveBeenCalledTimes(1);
    expect(mockCreateWorkItem).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "West branch",
      }),
    );
    expect(mockCreateRunStep).toHaveBeenCalledWith(
      expect.objectContaining({
        graphNodeId: aWest,
        automationStepId: null,
      }),
    );
    expect(mockUpdateRun).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({
        status: "SUCCEEDED",
        stepOutput: expect.objectContaining({
          __automationGraph: {
            branchDecisions: { [swId]: "west" },
          },
        }),
      }),
    );
  });

  it("LIVE switch follows default edge when discriminant matches no other key", async () => {
    const entryId = "61616161-6161-4161-8161-616161616161";
    const swId = "62626262-6262-4262-8262-626262626262";
    const aEast = "63636363-6363-4363-8363-636363636363";
    const aWest = "64646464-6464-4464-8464-646464646464";
    const aDefault = "65656565-6565-4565-8565-656565656565";

    const flowGraph = {
      nodes: [
        { id: entryId, kind: "entry" as const },
        {
          id: swId,
          kind: "switch" as const,
          config: { discriminantPath: "region" },
        },
        {
          id: aEast,
          kind: "action" as const,
          config: {
            actionType: "workitem.create" as const,
            actionConfig: {
              title: "East only",
              type: "TASK",
              priority: "HIGH",
            },
          },
        },
        {
          id: aWest,
          kind: "action" as const,
          config: {
            actionType: "workitem.create" as const,
            actionConfig: {
              title: "West only",
              type: "TASK",
              priority: "HIGH",
            },
          },
        },
        {
          id: aDefault,
          kind: "action" as const,
          config: {
            actionType: "workitem.create" as const,
            actionConfig: {
              title: "Default only",
              type: "TASK",
              priority: "HIGH",
            },
          },
        },
      ],
      edges: [
        { fromNodeId: entryId, toNodeId: swId },
        { fromNodeId: swId, toNodeId: aEast, edgeKey: "east" },
        { fromNodeId: swId, toNodeId: aWest, edgeKey: "west" },
        { fromNodeId: swId, toNodeId: aDefault, edgeKey: "default" },
      ],
    };

    mockFindEventById.mockResolvedValue({
      ...baseEvent,
      payload: { ...baseEvent.payload, region: "north" },
    });

    mockFindMatchingDefinitions.mockResolvedValue([
      {
        id: "auto-switch-default",
        executionMode: "LIVE",
        triggers: [
          {
            id: "trigger-1",
            eventName: "inventory.stock.low_detected",
            conditionGroups: null,
          },
        ],
        steps: [],
        flowGraph,
      },
    ]);

    await processAutomationEventById("event-1");

    expect(mockCreateWorkItem).toHaveBeenCalledTimes(1);
    expect(mockCreateWorkItem).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Default only" }),
    );
    expect(mockCreateRunStep).toHaveBeenCalledWith(
      expect.objectContaining({
        graphNodeId: aDefault,
        automationStepId: null,
      }),
    );
    expect(mockUpdateRun).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({
        stepOutput: expect.objectContaining({
          __automationGraph: {
            branchDecisions: { [swId]: "default" },
          },
        }),
      }),
    );
  });

  // AT-SHD-003 — single-path SHADOW switch + branchDecisions metadata
  it("SHADOW switch previews only the chosen branch action", async () => {
    const entryId = "91919191-9191-4191-8191-919191919191";
    const swId = "92929292-9292-4292-8292-929292929292";
    const aEast = "93939393-9393-4393-8393-939393939393";
    const aWest = "94949494-9494-4494-8494-949494949494";
    const aDefault = "95959595-9595-4595-8595-959595959595";

    const flowGraph = {
      nodes: [
        { id: entryId, kind: "entry" as const },
        {
          id: swId,
          kind: "switch" as const,
          config: { discriminantPath: "region" },
        },
        {
          id: aEast,
          kind: "action" as const,
          config: {
            actionType: "workitem.create" as const,
            actionConfig: {
              title: "SHADOW east",
              type: "TASK",
              priority: "HIGH",
            },
          },
        },
        {
          id: aWest,
          kind: "action" as const,
          config: {
            actionType: "workitem.create" as const,
            actionConfig: {
              title: "SHADOW west",
              type: "TASK",
              priority: "HIGH",
            },
          },
        },
        {
          id: aDefault,
          kind: "action" as const,
          config: {
            actionType: "workitem.create" as const,
            actionConfig: {
              title: "SHADOW default",
              type: "TASK",
              priority: "HIGH",
            },
          },
        },
      ],
      edges: [
        { fromNodeId: entryId, toNodeId: swId },
        { fromNodeId: swId, toNodeId: aEast, edgeKey: "east" },
        { fromNodeId: swId, toNodeId: aWest, edgeKey: "west" },
        { fromNodeId: swId, toNodeId: aDefault, edgeKey: "default" },
      ],
    };

    mockFindEventById.mockResolvedValue({
      ...baseEvent,
      payload: { ...baseEvent.payload, region: "east" },
    });

    mockFindMatchingDefinitions.mockResolvedValue([
      {
        id: "auto-shadow-switch-east",
        executionMode: "SHADOW",
        triggers: [
          {
            id: "trigger-1",
            eventName: "inventory.stock.low_detected",
            conditionGroups: null,
          },
        ],
        steps: [],
        flowGraph,
      },
    ]);

    await processAutomationEventById("event-1");

    expect(mockCreateWorkItem).not.toHaveBeenCalled();
    expect(mockCreateRunStep).toHaveBeenCalledTimes(1);
    expect(mockCreateRunStep).toHaveBeenCalledWith(
      expect.objectContaining({
        graphNodeId: aEast,
        status: "SKIPPED",
        output: expect.objectContaining({ simulated: true }),
      }),
    );
    expect(mockUpdateRun).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({
        status: "SKIPPED",
        stepOutput: expect.objectContaining({
          __automationGraph: {
            branchDecisions: { [swId]: "east" },
          },
        }),
      }),
    );
  });

  // AT-LIV-004 / AT-EC-004
  it("LIVE switch matches numeric discriminant to string edge key (String coercion)", async () => {
    const entryId = "81818181-8181-4181-8181-818181818181";
    const swId = "82828282-8282-4282-8282-828282828282";
    const aOne = "83838383-8383-4383-8383-838383838383";
    const aDefault = "84848484-8484-4484-8484-848484848484";

    const flowGraph = {
      nodes: [
        { id: entryId, kind: "entry" as const },
        {
          id: swId,
          kind: "switch" as const,
          config: { discriminantPath: "code" },
        },
        {
          id: aOne,
          kind: "action" as const,
          config: {
            actionType: "workitem.create" as const,
            actionConfig: {
              title: "Coerced one",
              type: "TASK",
              priority: "HIGH",
            },
          },
        },
        {
          id: aDefault,
          kind: "action" as const,
          config: {
            actionType: "workitem.create" as const,
            actionConfig: {
              title: "Coerced default",
              type: "TASK",
              priority: "HIGH",
            },
          },
        },
      ],
      edges: [
        { fromNodeId: entryId, toNodeId: swId },
        { fromNodeId: swId, toNodeId: aOne, edgeKey: "1" },
        { fromNodeId: swId, toNodeId: aDefault, edgeKey: "default" },
      ],
    };

    mockFindEventById.mockResolvedValue({
      ...baseEvent,
      payload: { ...baseEvent.payload, code: 1 },
    });

    mockFindMatchingDefinitions.mockResolvedValue([
      {
        id: "auto-switch-coerce",
        executionMode: "LIVE",
        triggers: [
          {
            id: "trigger-1",
            eventName: "inventory.stock.low_detected",
            conditionGroups: null,
          },
        ],
        steps: [],
        flowGraph,
      },
    ]);

    await processAutomationEventById("event-1");

    expect(mockCreateWorkItem).toHaveBeenCalledTimes(1);
    expect(mockCreateWorkItem).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Coerced one" }),
    );
    expect(mockUpdateRun).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({
        stepOutput: expect.objectContaining({
          __automationGraph: {
            branchDecisions: { [swId]: "1" },
          },
        }),
      }),
    );
  });

  // AT-LIV-004 / AT-EC-004 — numeric discriminant coerced to string edge key (LIVE).
  it("SHADOW switch matches numeric discriminant to string edge key (String coercion) — AT-SHD-003 + coercion", async () => {
    const entryId = "61616161-6161-4161-8161-616161616161";
    const swId = "62626262-6262-4262-8262-626262626262";
    const aOne = "63636363-6363-4363-8363-636363636363";
    const aDefault = "64646464-6464-4464-8464-646464646464";

    const flowGraph = {
      nodes: [
        { id: entryId, kind: "entry" as const },
        {
          id: swId,
          kind: "switch" as const,
          config: { discriminantPath: "code" },
        },
        {
          id: aOne,
          kind: "action" as const,
          config: {
            actionType: "workitem.create" as const,
            actionConfig: {
              title: "SHADOW coerced one",
              type: "TASK",
              priority: "HIGH",
            },
          },
        },
        {
          id: aDefault,
          kind: "action" as const,
          config: {
            actionType: "workitem.create" as const,
            actionConfig: {
              title: "SHADOW coerced default",
              type: "TASK",
              priority: "HIGH",
            },
          },
        },
      ],
      edges: [
        { fromNodeId: entryId, toNodeId: swId },
        { fromNodeId: swId, toNodeId: aOne, edgeKey: "1" },
        { fromNodeId: swId, toNodeId: aDefault, edgeKey: "default" },
      ],
    };

    mockFindEventById.mockResolvedValue({
      ...baseEvent,
      payload: { ...baseEvent.payload, code: 1 },
    });

    mockFindMatchingDefinitions.mockResolvedValue([
      {
        id: "auto-shadow-switch-coerce",
        executionMode: "SHADOW",
        triggers: [
          {
            id: "trigger-1",
            eventName: "inventory.stock.low_detected",
            conditionGroups: null,
          },
        ],
        steps: [],
        flowGraph,
      },
    ]);

    await processAutomationEventById("event-1");

    expect(mockCreateWorkItem).not.toHaveBeenCalled();
    expect(mockCreateRunStep).toHaveBeenCalledTimes(1);
    expect(mockCreateRunStep).toHaveBeenCalledWith(
      expect.objectContaining({
        graphNodeId: aOne,
        status: "SKIPPED",
        output: expect.objectContaining({ simulated: true }),
      }),
    );
    expect(mockUpdateRun).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({
        stepOutput: expect.objectContaining({
          __automationGraph: {
            branchDecisions: { [swId]: "1" },
          },
        }),
      }),
    );
  });

  // AT-LIV-009 — non-scalar switch discriminant (LIVE).
  it("LIVE switch fails when discriminant is a non-scalar object", async () => {
    const entryId = "71717171-7171-4171-8171-717171717171";
    const swId = "72727272-7272-4272-8272-727272727272";
    const aOne = "73737373-7373-4373-8373-737373737373";
    const aDefault = "74747474-7474-4474-8474-747474747474";

    const flowGraph = {
      nodes: [
        { id: entryId, kind: "entry" as const },
        {
          id: swId,
          kind: "switch" as const,
          config: { discriminantPath: "region" },
        },
        {
          id: aOne,
          kind: "action" as const,
          config: {
            actionType: "workitem.create" as const,
            actionConfig: {
              title: "Scalar path",
              type: "TASK",
              priority: "HIGH",
            },
          },
        },
        {
          id: aDefault,
          kind: "action" as const,
          config: {
            actionType: "workitem.create" as const,
            actionConfig: {
              title: "Default path",
              type: "TASK",
              priority: "HIGH",
            },
          },
        },
      ],
      edges: [
        { fromNodeId: entryId, toNodeId: swId },
        { fromNodeId: swId, toNodeId: aOne, edgeKey: "east" },
        { fromNodeId: swId, toNodeId: aDefault, edgeKey: "default" },
      ],
    };

    mockFindEventById.mockResolvedValue({
      ...baseEvent,
      payload: { ...baseEvent.payload, region: { nested: "x" } },
    });

    mockFindMatchingDefinitions.mockResolvedValue([
      {
        id: "auto-switch-bad-disc",
        executionMode: "LIVE",
        triggers: [
          {
            id: "trigger-1",
            eventName: "inventory.stock.low_detected",
            conditionGroups: null,
          },
        ],
        steps: [],
        flowGraph,
      },
    ]);

    await processAutomationEventById("event-1");

    expect(mockCreateWorkItem).not.toHaveBeenCalled();
    expect(mockUpdateRun).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({
        status: "FAILED",
        errorMessage: "Switch discriminant must be a scalar",
      }),
    );
  });

  it("SHADOW switch stops preview when discriminant is a non-scalar object", async () => {
    const entryId = "51515151-5151-4151-8151-515151515151";
    const swId = "52525252-5252-4252-8252-525252525252";
    const aEast = "53535353-5353-4353-8353-535353535353";
    const aDefault = "54545454-5454-4454-8454-545454545454";

    const flowGraph = {
      nodes: [
        { id: entryId, kind: "entry" as const },
        {
          id: swId,
          kind: "switch" as const,
          config: { discriminantPath: "region" },
        },
        {
          id: aEast,
          kind: "action" as const,
          config: {
            actionType: "workitem.create" as const,
            actionConfig: {
              title: "Shadow east",
              type: "TASK",
              priority: "HIGH",
            },
          },
        },
        {
          id: aDefault,
          kind: "action" as const,
          config: {
            actionType: "workitem.create" as const,
            actionConfig: {
              title: "Shadow default",
              type: "TASK",
              priority: "HIGH",
            },
          },
        },
      ],
      edges: [
        { fromNodeId: entryId, toNodeId: swId },
        { fromNodeId: swId, toNodeId: aEast, edgeKey: "east" },
        { fromNodeId: swId, toNodeId: aDefault, edgeKey: "default" },
      ],
    };

    mockFindEventById.mockResolvedValue({
      ...baseEvent,
      payload: { ...baseEvent.payload, region: { nested: "x" } },
    });

    mockFindMatchingDefinitions.mockResolvedValue([
      {
        id: "auto-shadow-bad-disc",
        executionMode: "SHADOW",
        triggers: [
          {
            id: "trigger-1",
            eventName: "inventory.stock.low_detected",
            conditionGroups: null,
          },
        ],
        steps: [],
        flowGraph,
      },
    ]);

    await processAutomationEventById("event-1");

    expect(mockCreateWorkItem).not.toHaveBeenCalled();
    expect(mockCreateRunStep).not.toHaveBeenCalled();
    expect(mockUpdateRun).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({
        status: "SKIPPED",
        stepOutput: expect.objectContaining({
          __automationGraph: {
            branchDecisions: {},
          },
        }),
      }),
    );
  });

  // AT-RSU-001 / AT-RSU-002 — resume follows frozen branch; payload change does not re-pick if/switch.
  it("resumes failed graph runs using frozen branch decisions (BR-16)", async () => {
    const entryId = "11111111-1111-1111-1111-111111111111";
    const ifId = "22222222-2222-2222-2222-222222222222";
    const actionId = "33333333-3333-3333-3333-333333333333";
    const noopFalseId = "44444444-4444-4444-4444-444444444444";
    const noopEndId = "55555555-5555-5555-5555-555555555555";

    const flowGraph = {
      nodes: [
        { id: entryId, kind: "entry" as const },
        {
          id: ifId,
          kind: "if" as const,
          config: {
            conditions: [
              { path: "runHot", operator: "eq" as const, value: true },
            ],
          },
        },
        {
          id: actionId,
          kind: "action" as const,
          config: {
            actionType: "workitem.create" as const,
            actionConfig: {
              title: "Task",
              type: "TASK",
              priority: "HIGH",
            },
          },
        },
        { id: noopFalseId, kind: "noop" as const },
        { id: noopEndId, kind: "noop" as const },
      ],
      edges: [
        { fromNodeId: entryId, toNodeId: ifId },
        { fromNodeId: ifId, toNodeId: actionId, edgeKey: "true" },
        { fromNodeId: ifId, toNodeId: noopFalseId, edgeKey: "false" },
        { fromNodeId: actionId, toNodeId: noopEndId },
      ],
    };

    mockFindFailedLiveRunsForEventReplay.mockResolvedValue([
      {
        id: "run-graph-1",
        tenantId: "tenant-1",
        automationEventId: "event-1",
        status: "FAILED",
        executionMode: "LIVE",
        stepOutput: {
          __automationGraph: { branchDecisions: { [ifId]: "true" } },
        },
        runSteps: [
          {
            id: "rs-action",
            graphNodeId: actionId,
            automationStepId: null,
            status: "FAILED",
            output: null,
          },
        ],
        automation: {
          id: "auto-graph-1",
          status: "ACTIVE",
          executionMode: "LIVE",
          flowGraph,
          steps: [],
          triggers: [
            {
              id: "tr-1",
              eventName: "inventory.stock.low_detected",
              conditionGroups: null,
            },
          ],
        },
      },
    ]);

    mockFindEventById.mockResolvedValue({
      ...baseEvent,
      payload: { runHot: false },
    });

    const resumed = await resumeFailedAutomationRunsForEvent(
      "tenant-1",
      "event-1",
    );

    expect(resumed).toBe(1);
    expect(mockCreateWorkItem).toHaveBeenCalledTimes(1);
    expect(
      mockUpdateRun.mock.calls.some((c) => c[1]?.status === "SUCCEEDED"),
    ).toBe(true);
  });

  // AT-RSU-003 — switch id present in branchDecisions map but empty frozen key: no guess, resume fails.
  it("resume fails when persisted switch branch key is empty string", async () => {
    const entryId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const swId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const aEast = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const aDefault = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const noopId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

    const flowGraph = {
      nodes: [
        { id: entryId, kind: "entry" as const },
        {
          id: swId,
          kind: "switch" as const,
          config: { discriminantPath: "region" },
        },
        {
          id: aEast,
          kind: "action" as const,
          config: {
            actionType: "workitem.create" as const,
            actionConfig: {
              title: "East task",
              type: "TASK",
              priority: "HIGH",
            },
          },
        },
        {
          id: aDefault,
          kind: "action" as const,
          config: {
            actionType: "workitem.create" as const,
            actionConfig: {
              title: "Default task",
              type: "TASK",
              priority: "HIGH",
            },
          },
        },
        { id: noopId, kind: "noop" as const },
      ],
      edges: [
        { fromNodeId: entryId, toNodeId: swId },
        { fromNodeId: swId, toNodeId: aEast, edgeKey: "east" },
        { fromNodeId: swId, toNodeId: aDefault, edgeKey: "default" },
        { fromNodeId: aEast, toNodeId: noopId },
        { fromNodeId: aDefault, toNodeId: noopId },
      ],
    };

    mockFindFailedLiveRunsForEventReplay.mockResolvedValue([
      {
        id: "run-sw-bad",
        tenantId: "tenant-1",
        automationEventId: "event-1",
        status: "FAILED",
        executionMode: "LIVE",
        stepOutput: {
          __automationGraph: { branchDecisions: { [swId]: "" } },
        },
        runSteps: [
          {
            id: "rs-east",
            graphNodeId: aEast,
            automationStepId: null,
            status: "FAILED",
            output: null,
          },
        ],
        automation: {
          id: "auto-sw-bad",
          status: "ACTIVE",
          executionMode: "LIVE",
          flowGraph,
          steps: [],
          triggers: [
            {
              id: "tr-1",
              eventName: "inventory.stock.low_detected",
              conditionGroups: null,
            },
          ],
        },
      },
    ]);

    mockFindEventById.mockResolvedValue({
      ...baseEvent,
      payload: { ...baseEvent.payload, region: "east" },
    });

    const resumed = await resumeFailedAutomationRunsForEvent(
      "tenant-1",
      "event-1",
    );

    expect(resumed).toBe(1);
    expect(mockCreateWorkItem).not.toHaveBeenCalled();
    expect(
      mockUpdateRun.mock.calls.some(
        (c) =>
          c[1]?.status === "FAILED" &&
          String(c[1]?.errorMessage ?? "").match(/missing frozen branch/i),
      ),
    ).toBe(true);
  });

  // AT-RSU-003 — invalid frozen if key (not true/false).
  it("resume fails when persisted if branch key is not true or false", async () => {
    const entryId = "11111111-1111-1111-1111-111111111111";
    const ifId = "22222222-2222-2222-2222-222222222222";
    const actionId = "33333333-3333-3333-3333-333333333333";
    const noopFalseId = "44444444-4444-4444-4444-444444444444";
    const noopEndId = "55555555-5555-5555-5555-555555555555";

    const flowGraph = {
      nodes: [
        { id: entryId, kind: "entry" as const },
        {
          id: ifId,
          kind: "if" as const,
          config: {
            conditions: [
              { path: "runHot", operator: "eq" as const, value: true },
            ],
          },
        },
        {
          id: actionId,
          kind: "action" as const,
          config: {
            actionType: "workitem.create" as const,
            actionConfig: {
              title: "Task",
              type: "TASK",
              priority: "HIGH",
            },
          },
        },
        { id: noopFalseId, kind: "noop" as const },
        { id: noopEndId, kind: "noop" as const },
      ],
      edges: [
        { fromNodeId: entryId, toNodeId: ifId },
        { fromNodeId: ifId, toNodeId: actionId, edgeKey: "true" },
        { fromNodeId: ifId, toNodeId: noopFalseId, edgeKey: "false" },
        { fromNodeId: actionId, toNodeId: noopEndId },
      ],
    };

    mockFindFailedLiveRunsForEventReplay.mockResolvedValue([
      {
        id: "run-if-bad",
        tenantId: "tenant-1",
        automationEventId: "event-1",
        status: "FAILED",
        executionMode: "LIVE",
        stepOutput: {
          __automationGraph: { branchDecisions: { [ifId]: "maybe" } },
        },
        runSteps: [
          {
            id: "rs-action",
            graphNodeId: actionId,
            automationStepId: null,
            status: "FAILED",
            output: null,
          },
        ],
        automation: {
          id: "auto-if-bad",
          status: "ACTIVE",
          executionMode: "LIVE",
          flowGraph,
          steps: [],
          triggers: [
            {
              id: "tr-1",
              eventName: "inventory.stock.low_detected",
              conditionGroups: null,
            },
          ],
        },
      },
    ]);

    mockFindEventById.mockResolvedValue(baseEvent);

    const resumed = await resumeFailedAutomationRunsForEvent(
      "tenant-1",
      "event-1",
    );

    expect(resumed).toBe(1);
    expect(mockCreateWorkItem).not.toHaveBeenCalled();
    expect(
      mockUpdateRun.mock.calls.some(
        (c) =>
          c[1]?.status === "FAILED" &&
          String(c[1]?.errorMessage ?? "").match(/invalid frozen branch/i),
      ),
    ).toBe(true);
  });
});
