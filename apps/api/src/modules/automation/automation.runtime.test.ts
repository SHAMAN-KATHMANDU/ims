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
    findFailedLiveRunsForEventReplay: vi.fn().mockResolvedValue([]),
  },
}));

import { processAutomationEventById } from "./automation.runtime";

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
});
