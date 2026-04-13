import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAutomationEventUpdateMany = vi.fn();
const mockAutomationEventUpdate = vi.fn();
const mockAutomationEventFindMany = vi.fn();
const mockAutomationDefinitionCount = vi.fn();

vi.mock("@/config/prisma", () => ({
  basePrisma: {
    automationEvent: {
      updateMany: (...args: unknown[]) =>
        mockAutomationEventUpdateMany(...args),
      update: (...args: unknown[]) => mockAutomationEventUpdate(...args),
      findMany: (...args: unknown[]) => mockAutomationEventFindMany(...args),
    },
    automationDefinition: {
      count: (...args: unknown[]) => mockAutomationDefinitionCount(...args),
    },
  },
}));

import automationRepository from "./automation.repository";

describe("automation.repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("claims retryable events that are pending or failed and due", async () => {
    mockAutomationEventUpdateMany.mockResolvedValue({ count: 1 });
    const now = new Date("2026-04-02T00:00:00.000Z");
    const staleBefore = new Date("2026-04-01T23:58:00.000Z");

    const result = await automationRepository.claimEventForProcessing(
      "event-1",
      now,
      staleBefore,
    );

    expect(result).toBe(true);
    expect(mockAutomationEventUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "event-1",
        OR: [
          {
            status: { in: ["PENDING", "FAILED"] },
            nextAttemptAt: { lte: now },
          },
          {
            status: "PROCESSING",
            processingStartedAt: { lte: staleBefore },
          },
        ],
      },
      data: expect.objectContaining({
        status: "PROCESSING",
        lastAttemptAt: now,
        processingStartedAt: now,
      }),
    });
  });

  it("returns retryable event ids ordered by retry schedule", async () => {
    const now = new Date("2026-04-02T00:00:00.000Z");
    const staleBefore = new Date("2026-04-01T23:58:00.000Z");
    mockAutomationEventFindMany.mockResolvedValue([
      { id: "event-1" },
      { id: "event-2" },
    ]);

    const result = await automationRepository.findRetryableEventIds(
      now,
      staleBefore,
      8,
      20,
    );

    expect(result).toEqual(["event-1", "event-2"]);
    expect(mockAutomationEventFindMany).toHaveBeenCalledWith({
      where: {
        attempts: { lt: 8 },
        OR: [
          {
            status: { in: ["PENDING", "FAILED"] },
            nextAttemptAt: { lte: now },
          },
          {
            status: "PROCESSING",
            processingStartedAt: { lte: staleBefore },
          },
        ],
      },
      orderBy: [{ nextAttemptAt: "asc" }, { occurredAt: "asc" }],
      take: 20,
      select: { id: true },
    });
  });

  it("detects active CRM automations that suppress legacy workflows", async () => {
    mockAutomationDefinitionCount.mockResolvedValue(1);

    const result =
      await automationRepository.hasActiveAutomationSuppressingLegacyWorkflow({
        tenantId: "tenant-1",
        pipelineId: "pipeline-1",
        eventName: "crm.deal.created",
      });

    expect(result).toBe(true);
    expect(mockAutomationDefinitionCount).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant-1",
        status: "ACTIVE",
        suppressLegacyWorkflows: true,
        OR: [
          { scopeType: "GLOBAL", scopeId: null },
          { scopeType: "CRM_PIPELINE", scopeId: "pipeline-1" },
        ],
        triggers: {
          some: {
            eventName: "crm.deal.created",
          },
        },
      },
    });
  });

  it("marks exhausted events with a terminal status", async () => {
    mockAutomationEventUpdate.mockResolvedValue({ id: "event-1" });

    await automationRepository.markEventExhausted(
      "event-1",
      "Webhook failed with status 400",
    );

    expect(mockAutomationEventUpdate).toHaveBeenCalledWith({
      where: { id: "event-1" },
      data: {
        status: "EXHAUSTED",
        errorMessage: "Webhook failed with status 400",
        processingStartedAt: null,
        nextAttemptAt: expect.any(Date),
      },
    });
  });
});
