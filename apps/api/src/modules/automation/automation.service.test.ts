import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCountDefinitions = vi.fn();
const mockFindDefinitions = vi.fn();
const mockFindDefinitionById = vi.fn();
const mockCreateDefinition = vi.fn();
const mockUpdateDefinition = vi.fn();
const mockArchiveDefinition = vi.fn();
const mockFindEventById = vi.fn();
const mockFindRunsByAutomation = vi.fn();
const mockFindLocationInventorySummary = vi.fn();
const mockFindOpenInventorySignal = vi.fn();
const mockFindBestTransferSource = vi.fn();
const mockCreateInventorySignal = vi.fn();
const mockResolveInventorySignal = vi.fn();
const mockUpdateInventorySignal = vi.fn();
const mockPublishAutomationEvent = vi.fn();
const mockResumeFailedAutomationRunsForEvent = vi.fn();

vi.mock("./automation.repository", () => ({
  default: {
    countDefinitions: (...args: unknown[]) => mockCountDefinitions(...args),
    findDefinitions: (...args: unknown[]) => mockFindDefinitions(...args),
    findDefinitionById: (...args: unknown[]) => mockFindDefinitionById(...args),
    createDefinition: (...args: unknown[]) => mockCreateDefinition(...args),
    updateDefinition: (...args: unknown[]) => mockUpdateDefinition(...args),
    archiveDefinition: (...args: unknown[]) => mockArchiveDefinition(...args),
    findEventById: (...args: unknown[]) => mockFindEventById(...args),
    findRunsByAutomation: (...args: unknown[]) =>
      mockFindRunsByAutomation(...args),
    findLocationInventorySummary: (...args: unknown[]) =>
      mockFindLocationInventorySummary(...args),
    findOpenInventorySignal: (...args: unknown[]) =>
      mockFindOpenInventorySignal(...args),
    findBestTransferSource: (...args: unknown[]) =>
      mockFindBestTransferSource(...args),
    createInventorySignal: (...args: unknown[]) =>
      mockCreateInventorySignal(...args),
    resolveInventorySignal: (...args: unknown[]) =>
      mockResolveInventorySignal(...args),
    updateInventorySignal: (...args: unknown[]) =>
      mockUpdateInventorySignal(...args),
  },
}));

vi.mock("./automation.runtime", () => ({
  publishAutomationEvent: (...args: unknown[]) =>
    mockPublishAutomationEvent(...args),
  resumeFailedAutomationRunsForEvent: (...args: unknown[]) =>
    mockResumeFailedAutomationRunsForEvent(...args),
}));

import automationService from "./automation.service";

describe("automation.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated automation definitions", async () => {
    mockCountDefinitions.mockResolvedValue(1);
    mockFindDefinitions.mockResolvedValue([{ id: "auto-1", name: "Restock" }]);

    const result = await automationService.getDefinitions("t1", {
      page: 1,
      limit: 10,
      search: undefined,
      status: undefined,
      scopeType: undefined,
    });

    expect(mockCountDefinitions).toHaveBeenCalledWith("t1", expect.any(Object));
    expect(result.automations).toHaveLength(1);
    expect(result.pagination.totalItems).toBe(1);
  });

  it("throws 404 when automation definition is missing", async () => {
    mockFindDefinitionById.mockResolvedValue(null);

    await expect(
      automationService.getDefinitionById("t1", "auto-1"),
    ).rejects.toMatchObject({
      message: "Automation not found",
      statusCode: 404,
    });
  });

  it("publishes low-stock events only on threshold crossing", async () => {
    mockFindLocationInventorySummary.mockResolvedValue({
      quantity: 2,
      location: { name: "Showroom" },
      variation: { product: { name: "Sneaker", imsCode: "SKU-1" } },
    });
    mockFindOpenInventorySignal.mockResolvedValue(null);
    mockFindBestTransferSource.mockResolvedValue({
      locationId: "loc-warehouse",
    });
    mockCreateInventorySignal.mockResolvedValue({ id: "signal-1" });

    await automationService.syncLowStockSignal({
      tenantId: "t1",
      locationId: "loc-showroom",
      variationId: "var-1",
      subVariationId: null,
      actorUserId: "u1",
      reason: "sale_created",
    });

    expect(mockCreateInventorySignal).toHaveBeenCalled();
    expect(mockPublishAutomationEvent).toHaveBeenCalledTimes(2);
    expect(mockPublishAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "inventory.stock.low_detected",
        entityId: "signal-1",
      }),
    );
  });

  it("resolves existing low-stock signal when inventory recovers", async () => {
    mockFindLocationInventorySummary.mockResolvedValue({ quantity: 8 });
    mockFindOpenInventorySignal.mockResolvedValue({ id: "signal-1" });

    await automationService.syncLowStockSignal({
      tenantId: "t1",
      locationId: "loc-showroom",
      variationId: "var-1",
      subVariationId: null,
      actorUserId: "u1",
      reason: "inventory_set",
    });

    expect(mockResolveInventorySignal).toHaveBeenCalledWith("signal-1", 8);
    expect(mockPublishAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "inventory.stock.threshold_crossed",
      }),
    );
  });

  it("updates an existing active low-stock signal without re-emitting events", async () => {
    mockFindLocationInventorySummary.mockResolvedValue({
      quantity: 3,
      location: { name: "Showroom" },
      variation: { product: { name: "Sneaker", imsCode: "SKU-1" } },
    });
    mockFindOpenInventorySignal.mockResolvedValue({ id: "signal-1" });
    mockFindBestTransferSource.mockResolvedValue({
      locationId: "loc-warehouse",
    });

    await automationService.syncLowStockSignal({
      tenantId: "t1",
      locationId: "loc-showroom",
      variationId: "var-1",
      subVariationId: null,
      actorUserId: "u1",
      reason: "sale_edited",
    });

    expect(mockUpdateInventorySignal).toHaveBeenCalledWith(
      "signal-1",
      expect.objectContaining({
        currentQuantity: 3,
        recommendedSourceLocation: {
          connect: { id: "loc-warehouse" },
        },
      }),
    );
    expect(mockPublishAutomationEvent).not.toHaveBeenCalled();
  });

  it("uses a configured variation threshold when evaluating low stock", async () => {
    mockFindLocationInventorySummary.mockResolvedValue({
      quantity: 4,
      location: { name: "Showroom" },
      variation: {
        lowStockThreshold: 7,
        product: { name: "Sneaker", imsCode: "SKU-1" },
      },
      subVariation: null,
    });
    mockFindOpenInventorySignal.mockResolvedValue(null);
    mockFindBestTransferSource.mockResolvedValue(null);
    mockCreateInventorySignal.mockResolvedValue({ id: "signal-2" });

    await automationService.syncLowStockSignal({
      tenantId: "t1",
      locationId: "loc-showroom",
      variationId: "var-1",
      subVariationId: null,
      actorUserId: "u1",
      reason: "inventory_set",
    });

    expect(mockCreateInventorySignal).toHaveBeenCalledWith(
      expect.objectContaining({
        threshold: 7,
      }),
    );
    expect(mockPublishAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          threshold: 7,
        }),
      }),
    );
  });

  it("requeues failed automation events for replay", async () => {
    mockFindEventById.mockResolvedValue({
      id: "event-1",
      tenantId: "t1",
      eventName: "sales.sale.created",
      scopeType: "GLOBAL",
      scopeId: null,
      entityType: "SALE",
      entityId: "sale-1",
      actorUserId: "u1",
      dedupeKey: "sale:event-1",
      payload: { saleId: "sale-1" },
      status: "FAILED",
    });

    const result = await automationService.replayEvent("t1", "event-1", {
      reprocessFromStart: true,
    });

    expect(result).toEqual({
      replayQueued: true,
      resumedRuns: 0,
      mode: "full",
    });
    expect(mockResumeFailedAutomationRunsForEvent).not.toHaveBeenCalled();
    expect(mockPublishAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "t1",
        eventName: "sales.sale.created",
        dedupeKey: null,
        payload: { saleId: "sale-1" },
      }),
    );
  });

  it("resumes failed runs when reprocessFromStart is false and runs exist", async () => {
    mockFindEventById.mockResolvedValue({
      id: "event-1",
      tenantId: "t1",
      eventName: "sales.sale.created",
      scopeType: "GLOBAL",
      scopeId: null,
      entityType: "SALE",
      entityId: "sale-1",
      actorUserId: "u1",
      dedupeKey: "sale:event-1",
      payload: { saleId: "sale-1" },
      status: "FAILED",
    });
    mockResumeFailedAutomationRunsForEvent.mockResolvedValue(2);

    const result = await automationService.replayEvent("t1", "event-1", {
      reprocessFromStart: false,
    });

    expect(result).toEqual({
      replayQueued: true,
      resumedRuns: 2,
      mode: "resume",
    });
    expect(mockResumeFailedAutomationRunsForEvent).toHaveBeenCalledWith(
      "t1",
      "event-1",
    );
    expect(mockPublishAutomationEvent).not.toHaveBeenCalled();
  });

  it("falls back to full replay when reprocessFromStart is false and nothing to resume", async () => {
    mockFindEventById.mockResolvedValue({
      id: "event-1",
      tenantId: "t1",
      eventName: "sales.sale.created",
      scopeType: "GLOBAL",
      scopeId: null,
      entityType: "SALE",
      entityId: "sale-1",
      actorUserId: "u1",
      dedupeKey: "sale:event-1",
      payload: { saleId: "sale-1" },
      status: "FAILED",
    });
    mockResumeFailedAutomationRunsForEvent.mockResolvedValue(0);

    await automationService.replayEvent("t1", "event-1", {
      reprocessFromStart: false,
    });

    expect(mockResumeFailedAutomationRunsForEvent).toHaveBeenCalled();
    expect(mockPublishAutomationEvent).toHaveBeenCalled();
  });

  it("rejects replay when the event belongs to another tenant", async () => {
    mockFindEventById.mockResolvedValue({
      id: "event-1",
      tenantId: "other-tenant",
      status: "FAILED",
    });

    await expect(
      automationService.replayEvent("t1", "event-1", {
        reprocessFromStart: true,
      }),
    ).rejects.toMatchObject({
      message: "Automation event not found",
      statusCode: 404,
    });
  });

  it("rejects replay for events that are not failed or exhausted", async () => {
    mockFindEventById.mockResolvedValue({
      id: "event-1",
      tenantId: "t1",
      status: "PROCESSED",
    });

    await expect(
      automationService.replayEvent("t1", "event-1", {
        reprocessFromStart: false,
      }),
    ).rejects.toMatchObject({
      message: "Only failed or exhausted automation events can be replayed",
      statusCode: 409,
    });
  });
});
