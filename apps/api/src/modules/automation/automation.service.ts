import { createError } from "@/middlewares/errorHandler";
import type { Prisma } from "@prisma/client";
import { createPaginationResult } from "@/utils/pagination";
import automationRepository from "./automation.repository";
import type {
  CreateAutomationDefinitionDto,
  GetAutomationDefinitionsQueryDto,
  GetAutomationRunsQueryDto,
  ReplayAutomationEventDto,
  UpdateAutomationDefinitionDto,
} from "./automation.schema";
import {
  publishAutomationEvent,
  resumeFailedAutomationRunsForEvent,
} from "./automation.runtime";

const LOW_STOCK_THRESHOLD = 5;

function resolveLowStockThreshold(
  inventory: {
    variation?: { lowStockThreshold?: number | null } | null;
    subVariation?: { lowStockThreshold?: number | null } | null;
  } | null,
): number {
  const candidateThreshold =
    inventory?.subVariation?.lowStockThreshold ??
    inventory?.variation?.lowStockThreshold ??
    LOW_STOCK_THRESHOLD;

  return candidateThreshold > 0 ? candidateThreshold : LOW_STOCK_THRESHOLD;
}

function buildInventoryLowStockDedupeKey(input: {
  locationId: string;
  variationId: string;
  subVariationId: string | null;
}): string {
  return `inventory-low:${input.locationId}:${input.variationId}:${input.subVariationId ?? "base"}`;
}

function buildInventoryThresholdCrossedDedupeKey(
  direction: "LOW" | "RECOVERED",
  input: {
    locationId: string;
    variationId: string;
    subVariationId: string | null;
  },
): string {
  return `inventory-threshold-${direction.toLowerCase()}:${input.locationId}:${input.variationId}:${input.subVariationId ?? "base"}`;
}

export interface PublishAutomationDomainEventInput {
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
  payload: Record<string, unknown>;
}

export class AutomationService {
  async getDefinitions(
    tenantId: string,
    query: GetAutomationDefinitionsQueryDto,
  ) {
    const [totalItems, definitions] = await Promise.all([
      automationRepository.countDefinitions(tenantId, query),
      automationRepository.findDefinitions(tenantId, query),
    ]);

    const result = createPaginationResult(
      definitions,
      totalItems,
      query.page,
      query.limit,
    );

    return {
      automations: result.data,
      pagination: result.pagination,
    };
  }

  async getDefinitionById(tenantId: string, id: string) {
    const automation = await automationRepository.findDefinitionById(
      tenantId,
      id,
    );
    if (!automation) throw createError("Automation not found", 404);
    return automation;
  }

  async createDefinition(
    tenantId: string,
    userId: string,
    data: CreateAutomationDefinitionDto,
  ) {
    return automationRepository.createDefinition(tenantId, userId, data);
  }

  async updateDefinition(
    tenantId: string,
    id: string,
    userId: string,
    data: UpdateAutomationDefinitionDto,
  ) {
    const existing = await automationRepository.findDefinitionById(
      tenantId,
      id,
    );
    if (!existing) throw createError("Automation not found", 404);
    return automationRepository.updateDefinition(tenantId, id, userId, data);
  }

  async archiveDefinition(tenantId: string, id: string, userId: string) {
    const existing = await automationRepository.findDefinitionById(
      tenantId,
      id,
    );
    if (!existing) throw createError("Automation not found", 404);
    await automationRepository.archiveDefinition(tenantId, id, userId);
  }

  async getRuns(
    tenantId: string,
    id: string,
    query: GetAutomationRunsQueryDto,
  ) {
    const existing = await automationRepository.findDefinitionById(
      tenantId,
      id,
    );
    if (!existing) throw createError("Automation not found", 404);
    const runs = await automationRepository.findRunsByAutomation(
      tenantId,
      id,
      query.limit,
    );
    return { runs };
  }

  async replayEvent(
    tenantId: string,
    eventId: string,
    options: ReplayAutomationEventDto,
  ) {
    const existing = await automationRepository.findEventById(eventId);
    if (!existing || existing.tenantId !== tenantId) {
      throw createError("Automation event not found", 404);
    }
    if (!["FAILED", "EXHAUSTED"].includes(existing.status)) {
      throw createError(
        "Only failed or exhausted automation events can be replayed",
        409,
      );
    }

    if (options.reprocessFromStart === false) {
      const resumedRuns = await resumeFailedAutomationRunsForEvent(
        tenantId,
        eventId,
      );
      if (resumedRuns > 0) {
        return { replayQueued: true, resumedRuns, mode: "resume" as const };
      }
    }

    await publishAutomationEvent({
      tenantId: existing.tenantId,
      eventName: existing.eventName,
      scopeType: existing.scopeType,
      scopeId: existing.scopeId,
      entityType: existing.entityType,
      entityId: existing.entityId,
      actorUserId: existing.actorUserId,
      dedupeKey: null,
      payload: existing.payload as Prisma.InputJsonValue,
      occurredAt: new Date(),
    });

    return {
      replayQueued: true,
      resumedRuns: 0,
      mode: "full" as const,
    };
  }

  async publishDomainEvent(
    input: PublishAutomationDomainEventInput,
  ): Promise<void> {
    await publishAutomationEvent({
      tenantId: input.tenantId,
      eventName: input.eventName,
      scopeType: input.scopeType ?? null,
      scopeId: input.scopeId ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      actorUserId: input.actorUserId ?? null,
      dedupeKey: input.dedupeKey ?? null,
      payload: input.payload as Prisma.InputJsonValue,
      occurredAt: new Date(),
    });
  }

  async syncLowStockSignal(input: {
    tenantId: string;
    locationId: string;
    variationId: string;
    subVariationId?: string | null;
    actorUserId?: string | null;
    reason: string;
  }): Promise<void> {
    const subVariationId = input.subVariationId ?? null;
    const inventory = await automationRepository.findLocationInventorySummary(
      input.locationId,
      input.variationId,
      subVariationId,
    );

    const threshold = resolveLowStockThreshold(inventory);
    const currentQuantity = inventory?.quantity ?? 0;
    const existingSignal = await automationRepository.findOpenInventorySignal(
      input.tenantId,
      input.locationId,
      input.variationId,
      subVariationId,
    );
    const bestSource = await automationRepository.findBestTransferSource(
      input.tenantId,
      input.locationId,
      input.variationId,
      subVariationId,
    );
    const signalMetadata = {
      reason: input.reason,
      lastCheckedAt: new Date().toISOString(),
    };

    if (currentQuantity < threshold) {
      if (existingSignal) {
        await automationRepository.updateInventorySignal(existingSignal.id, {
          currentQuantity,
          threshold,
          recommendedSourceLocation: bestSource?.locationId
            ? { connect: { id: bestSource.locationId } }
            : { disconnect: true },
          metadata: signalMetadata as Prisma.InputJsonValue,
          updatedAt: new Date(),
        });
        return;
      }

      const signal = await automationRepository.createInventorySignal({
        tenantId: input.tenantId,
        locationId: input.locationId,
        variationId: input.variationId,
        subVariationId,
        threshold,
        currentQuantity,
        recommendedSourceLocationId: bestSource?.locationId ?? null,
        detectedById: input.actorUserId ?? null,
        metadata: signalMetadata as Prisma.InputJsonValue,
      });

      const suggestedTransfer =
        bestSource != null
          ? {
              fromLocationId: bestSource.locationId,
              toLocationId: input.locationId,
              notes: `Auto-drafted from low-stock signal for ${inventory?.variation.product.name ?? "inventory item"}.`,
              items: [
                {
                  variationId: input.variationId,
                  subVariationId,
                  quantity: Math.max(threshold - currentQuantity, 1),
                },
              ],
            }
          : null;

      const payload = {
        signalId: signal.id,
        locationId: input.locationId,
        locationName: inventory?.location.name ?? null,
        variationId: input.variationId,
        subVariationId,
        currentQuantity,
        threshold,
        product: inventory?.variation.product ?? null,
        suggestedTransfer,
        reason: input.reason,
      };

      await this.publishDomainEvent({
        tenantId: input.tenantId,
        eventName: "inventory.stock.low_detected",
        scopeType: "LOCATION",
        scopeId: input.locationId,
        entityType: "INVENTORY_SIGNAL",
        entityId: signal.id,
        actorUserId: input.actorUserId ?? null,
        dedupeKey: buildInventoryLowStockDedupeKey({
          locationId: input.locationId,
          variationId: input.variationId,
          subVariationId,
        }),
        payload,
      });

      await this.publishDomainEvent({
        tenantId: input.tenantId,
        eventName: "inventory.stock.threshold_crossed",
        scopeType: "LOCATION",
        scopeId: input.locationId,
        entityType: "INVENTORY_SIGNAL",
        entityId: signal.id,
        actorUserId: input.actorUserId ?? null,
        dedupeKey: buildInventoryThresholdCrossedDedupeKey("LOW", {
          locationId: input.locationId,
          variationId: input.variationId,
          subVariationId,
        }),
        payload: {
          ...payload,
          direction: "LOW",
        },
      });
      return;
    }

    if (existingSignal) {
      await automationRepository.resolveInventorySignal(
        existingSignal.id,
        currentQuantity,
      );
      await this.publishDomainEvent({
        tenantId: input.tenantId,
        eventName: "inventory.stock.threshold_crossed",
        scopeType: "LOCATION",
        scopeId: input.locationId,
        entityType: "INVENTORY_SIGNAL",
        entityId: existingSignal.id,
        actorUserId: input.actorUserId ?? null,
        dedupeKey: buildInventoryThresholdCrossedDedupeKey("RECOVERED", {
          locationId: input.locationId,
          variationId: input.variationId,
          subVariationId,
        }),
        payload: {
          signalId: existingSignal.id,
          locationId: input.locationId,
          variationId: input.variationId,
          subVariationId,
          currentQuantity,
          threshold,
          direction: "RECOVERED",
          reason: input.reason,
        },
      });
    }
  }
}

export default new AutomationService();
