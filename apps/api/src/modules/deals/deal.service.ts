import { createError } from "@/middlewares/errorHandler";
import { createDeleteAuditLog } from "@/shared/audit/createDeleteAuditLog";
import { executeWorkflowRules } from "@/modules/workflows/workflow.engine";
import pipelineTransitionService from "@/modules/pipeline-transitions/pipeline-transition.service";
import { logger } from "@/config/logger";
import dealRepository from "./deal.repository";
import {
  createSaleWithItemsAndDeductInventory,
  findLocationById,
  type CreateSaleWithItemsInput,
} from "@/modules/sales/sale.repository";
import type {
  CreateDealDto,
  UpdateDealDto,
  UpdateDealStageDto,
  AddDealLineItemDto,
  ConvertDealToSaleDto,
} from "./deal.schema";

function generateSaleCode(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SL-${dateStr}-${random}`;
}

export class DealService {
  async create(tenantId: string, data: CreateDealDto, userId: string) {
    const pipeline = await dealRepository.findDefaultPipeline(
      tenantId,
      data.pipelineId,
    );
    if (!pipeline) {
      throw createError(
        "No pipeline found. Create a default pipeline first.",
        400,
      );
    }

    const stages = pipeline.stages as Array<{ id: string; name: string }>;
    const firstStage =
      Array.isArray(stages) && stages.length > 0
        ? stages[0].name
        : "Qualification";
    const stage = data.stage || firstStage;

    const deal = await dealRepository.create(
      tenantId,
      data,
      userId,
      stage,
      pipeline.id,
    );
    await executeWorkflowRules({
      trigger: "DEAL_CREATED",
      deal: toDealContext(deal),
      userId,
    }).catch((err) =>
      logger.error("Workflow execution failed", undefined, {
        dealId: deal.id,
        tenantId: deal.tenantId,
        trigger: "DEAL_CREATED",
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return deal;
  }

  async getAll(tenantId: string, query: Record<string, unknown>) {
    return dealRepository.findAll(tenantId, query);
  }

  async getByPipeline(tenantId: string, pipelineId?: string) {
    const result = await dealRepository.findKanban(tenantId, pipelineId);
    if (!result) throw createError("No pipeline found", 404);
    return result;
  }

  async getById(tenantId: string, id: string) {
    const deal = await dealRepository.findById(tenantId, id);
    if (!deal) throw createError("Deal not found", 404);
    return deal;
  }

  async update(
    tenantId: string,
    id: string,
    data: UpdateDealDto,
    userId: string,
  ) {
    const existing = await dealRepository.findById(tenantId, id);
    if (!existing) throw createError("Deal not found", 404);

    const { editReason, ...updates } = data;
    const deal = await dealRepository.createDealRevision(
      id,
      tenantId,
      updates,
      userId,
      editReason ?? null,
    );
    if (!deal) throw createError("Deal not found", 404);

    if (
      updates.stage &&
      updates.stage !== existing.stage &&
      existing.assignedToId
    ) {
      await dealRepository.createNotification(
        existing.assignedToId,
        deal.id,
        deal.name,
        updates.stage,
      );
      const logWorkflowErr = (trigger: string) => (err: unknown) =>
        logger.error("Workflow execution failed", undefined, {
          dealId: deal.id,
          tenantId: deal.tenantId,
          trigger,
          error: err instanceof Error ? err.message : String(err),
        });
      await executeWorkflowRules({
        trigger: "STAGE_EXIT",
        deal: toDealContext(deal),
        previousStage: existing.stage,
        userId: existing.assignedToId,
      }).catch(logWorkflowErr("STAGE_EXIT"));
      await executeWorkflowRules({
        trigger: "STAGE_ENTER",
        deal: toDealContext(deal),
        previousStage: existing.stage,
        userId: existing.assignedToId,
      }).catch(logWorkflowErr("STAGE_ENTER"));

      // Cross-pipeline transition on stage enter
      await pipelineTransitionService
        .handleDealEvent({
          trigger: "STAGE_ENTER",
          deal: toDealContext(deal),
          previousStage: existing.stage,
          userId: existing.assignedToId,
        })
        .catch((err) =>
          logger.error("Pipeline transition failed", undefined, {
            dealId: deal.id,
            trigger: "STAGE_ENTER",
            error: err instanceof Error ? err.message : String(err),
          }),
        );
    }

    if (updates.status === "WON") {
      await executeWorkflowRules({
        trigger: "DEAL_WON",
        deal: toDealContext(deal),
        userId: existing.assignedToId,
      }).catch((err) =>
        logger.error("Workflow execution failed", undefined, {
          dealId: deal.id,
          tenantId: deal.tenantId,
          trigger: "DEAL_WON",
          error: err instanceof Error ? err.message : String(err),
        }),
      );
      await pipelineTransitionService
        .handleDealEvent({
          trigger: "DEAL_WON",
          deal: toDealContext(deal),
          userId: existing.assignedToId,
        })
        .catch((err) =>
          logger.error("Pipeline transition failed", undefined, {
            dealId: deal.id,
            trigger: "DEAL_WON",
            error: err instanceof Error ? err.message : String(err),
          }),
        );
    } else if (updates.status === "LOST") {
      await executeWorkflowRules({
        trigger: "DEAL_LOST",
        deal: toDealContext(deal),
        userId: existing.assignedToId,
      }).catch((err) =>
        logger.error("Workflow execution failed", undefined, {
          dealId: deal.id,
          tenantId: deal.tenantId,
          trigger: "DEAL_LOST",
          error: err instanceof Error ? err.message : String(err),
        }),
      );
      await pipelineTransitionService
        .handleDealEvent({
          trigger: "DEAL_LOST",
          deal: toDealContext(deal),
          userId: existing.assignedToId,
        })
        .catch((err) =>
          logger.error("Pipeline transition failed", undefined, {
            dealId: deal.id,
            trigger: "DEAL_LOST",
            error: err instanceof Error ? err.message : String(err),
          }),
        );
    }

    return deal;
  }

  async updateStage(
    tenantId: string,
    id: string,
    data: UpdateDealStageDto,
    userId: string,
  ) {
    const existing = await dealRepository.findById(tenantId, id);
    if (!existing) throw createError("Deal not found", 404);

    const deal = await dealRepository.createDealRevision(
      id,
      tenantId,
      { stage: data.stage },
      userId,
      null,
    );
    if (!deal) throw createError("Deal not found", 404);

    if (existing.assignedToId) {
      await dealRepository.createNotification(
        existing.assignedToId,
        deal.id,
        deal.name,
        data.stage,
      );
      const logWorkflowErr = (trigger: string) => (err: unknown) =>
        logger.error("Workflow execution failed", undefined, {
          dealId: deal.id,
          tenantId: deal.tenantId,
          trigger,
          error: err instanceof Error ? err.message : String(err),
        });
      await executeWorkflowRules({
        trigger: "STAGE_EXIT",
        deal: toDealContext(deal),
        previousStage: existing.stage,
        userId: existing.assignedToId,
      }).catch(logWorkflowErr("STAGE_EXIT"));
      await executeWorkflowRules({
        trigger: "STAGE_ENTER",
        deal: toDealContext(deal),
        previousStage: existing.stage,
        userId: existing.assignedToId,
      }).catch(logWorkflowErr("STAGE_ENTER"));

      await pipelineTransitionService
        .handleDealEvent({
          trigger: "STAGE_ENTER",
          deal: toDealContext(deal),
          previousStage: existing.stage,
          userId: existing.assignedToId,
        })
        .catch((err) =>
          logger.error("Pipeline transition failed", undefined, {
            dealId: deal.id,
            trigger: "STAGE_ENTER",
            error: err instanceof Error ? err.message : String(err),
          }),
        );
    }

    return deal;
  }

  async addLineItem(
    tenantId: string,
    dealId: string,
    data: AddDealLineItemDto,
  ) {
    const deal = await dealRepository.findById(tenantId, dealId);
    if (!deal) throw createError("Deal not found", 404);
    return dealRepository.addLineItem(dealId, {
      productId: data.productId,
      variationId: data.variationId ?? null,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
    });
  }

  async removeLineItem(tenantId: string, dealId: string, lineItemId: string) {
    const deal = await dealRepository.findById(tenantId, dealId);
    if (!deal) throw createError("Deal not found", 404);
    const result = await dealRepository.removeLineItem(dealId, lineItemId);
    if (result.count === 0) throw createError("Line item not found", 404);
  }

  async convertToSale(
    tenantId: string,
    dealId: string,
    userId: string,
    data: ConvertDealToSaleDto,
  ) {
    const location = await findLocationById(data.locationId);
    if (!location || location.tenantId !== tenantId) {
      throw createError("Location not found", 404);
    }
    const deal = await dealRepository.findById(tenantId, dealId);
    if (!deal) throw createError("Deal not found", 404);
    if (deal.status !== "WON") {
      throw createError("Only won deals can be converted to a sale", 400);
    }
    const rawDeal = deal as {
      lineItems?: Array<{
        productId: string;
        variationId: string | null;
        quantity: number;
        unitPrice: unknown;
      }>;
    };
    const lineItems = rawDeal.lineItems ?? [];
    if (lineItems.length === 0) {
      throw createError("Deal has no line items to convert", 400);
    }

    const items: CreateSaleWithItemsInput["items"] = [];
    for (const item of lineItems) {
      let variationId = item.variationId;
      if (!variationId) {
        const variation = await dealRepository.findFirstVariationByProduct(
          item.productId,
          tenantId,
        );
        if (!variation) {
          throw createError(
            `Product has no active variation for line item`,
            400,
          );
        }
        variationId = variation.id;
      }
      const qty = item.quantity;
      const unitPrice =
        typeof item.unitPrice === "object" &&
        item.unitPrice !== null &&
        "toNumber" in item.unitPrice &&
        typeof (item.unitPrice as { toNumber: () => number }).toNumber ===
          "function"
          ? (item.unitPrice as { toNumber: () => number }).toNumber()
          : Number(item.unitPrice);
      const totalMrp = unitPrice * qty;
      items.push({
        variationId,
        subVariationId: null,
        quantity: qty,
        unitPrice,
        totalMrp,
        discountPercent: 0,
        discountAmount: 0,
        lineTotal: totalMrp,
      });
    }
    const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
    const saleInput: CreateSaleWithItemsInput = {
      tenantId,
      saleCode: generateSaleCode(),
      type: deal.memberId ? "MEMBER" : "GENERAL",
      isCreditSale: false,
      locationId: data.locationId,
      memberId: deal.memberId ?? null,
      contactId: deal.contactId ?? null,
      createdById: userId,
      subtotal,
      discount: 0,
      total: subtotal,
      notes: `Converted from deal: ${deal.name}`,
      items,
    };
    const sale = await createSaleWithItemsAndDeductInventory(saleInput);

    if (deal.contactId) {
      try {
        const contactRepository = (
          await import("@/modules/contacts/contact.repository")
        ).default;
        await contactRepository.incrementPurchaseCount(deal.contactId);
        const { applyLoyaltyTier } =
          await import("@/modules/contacts/loyalty.service");
        await applyLoyaltyTier(deal.contactId);
      } catch {
        logger.error(
          "Failed to increment purchaseCount after deal conversion",
          undefined,
          {
            dealId,
            contactId: deal.contactId,
          },
        );
      }
    }

    return sale;
  }

  async delete(
    tenantId: string,
    id: string,
    ctx: { userId: string; reason?: string; ip?: string; userAgent?: string },
  ) {
    const existing = await dealRepository.findById(tenantId, id);
    if (!existing) throw createError("Deal not found", 404);
    await dealRepository.createDeleteRevision(id, tenantId, {
      deletedBy: ctx.userId,
      deleteReason: ctx.reason ?? null,
    });
    await createDeleteAuditLog({
      userId: ctx.userId,
      tenantId,
      resource: "Deal",
      resourceId: id,
      deleteReason: ctx.reason ?? undefined,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }
}

function toDealContext(deal: {
  id: string;
  tenantId: string;
  pipelineId: string;
  stage: string;
  status: string;
  contactId: string | null;
  memberId: string | null;
  assignedToId: string;
  createdById: string;
}) {
  return {
    id: deal.id,
    tenantId: deal.tenantId,
    pipelineId: deal.pipelineId,
    stage: deal.stage,
    status: deal.status,
    contactId: deal.contactId,
    memberId: deal.memberId,
    assignedToId: deal.assignedToId,
    createdById: deal.createdById,
  };
}

export default new DealService();
