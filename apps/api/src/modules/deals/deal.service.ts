import { createError } from "@/middlewares/errorHandler";
import { createDeleteAuditLog } from "@/shared/audit/createDeleteAuditLog";
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

    return dealRepository.create(tenantId, data, userId, stage, pipeline.id);
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

  async update(tenantId: string, id: string, data: UpdateDealDto) {
    const existing = await dealRepository.findById(tenantId, id);
    if (!existing) throw createError("Deal not found", 404);

    const deal = await dealRepository.update(id, data, existing.name);

    if (data.stage && data.stage !== existing.stage && existing.assignedToId) {
      await dealRepository.createNotification(
        existing.assignedToId,
        deal.id,
        deal.name,
        data.stage,
      );
    }

    return deal;
  }

  async updateStage(tenantId: string, id: string, data: UpdateDealStageDto) {
    const existing = await dealRepository.findById(tenantId, id);
    if (!existing) throw createError("Deal not found", 404);

    const deal = await dealRepository.updateStage(id, data.stage);

    if (existing.assignedToId) {
      await dealRepository.createNotification(
        existing.assignedToId,
        deal.id,
        deal.name,
        data.stage,
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

  async removeLineItem(
    tenantId: string,
    dealId: string,
    lineItemId: string,
  ) {
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
        typeof (item.unitPrice as { toNumber: () => number }).toNumber === "function"
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
    return createSaleWithItemsAndDeductInventory(saleInput);
  }

  async delete(
    tenantId: string,
    id: string,
    ctx: { userId: string; reason?: string; ip?: string; userAgent?: string },
  ) {
    const existing = await dealRepository.findById(tenantId, id);
    if (!existing) throw createError("Deal not found", 404);
    await dealRepository.softDelete(id, {
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

export default new DealService();
