import { createError } from "@/middlewares/errorHandler";
import { createDeleteAuditLog } from "@/shared/audit/createDeleteAuditLog";
import { executeWorkflowRules } from "@/modules/workflows/workflow.engine";
import { runWithIncreasedWorkflowNestingDepth } from "@/modules/workflows/workflow-execution-context";
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

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resolveStageOnPipeline(
  stages: unknown,
  stageIdOrName: string,
): { name: string } | null {
  if (!stages || !Array.isArray(stages)) return null;
  const isUuid = UUID_REGEX.test(stageIdOrName);
  const row = (stages as Array<{ id?: string; name: string }>).find((s) =>
    isUuid ? s.id === stageIdOrName : String(s.name) === stageIdOrName,
  );
  if (!row?.name) return null;
  return { name: String(row.name) };
}

function generateSaleCode(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SL-${dateStr}-${random}`;
}

export class DealService {
  private async syncContactJourneyTypeToPipeline(
    tenantId: string,
    contactId: string | null | undefined,
    pipelineName: string | null | undefined,
  ): Promise<void> {
    const normalizedPipelineName = pipelineName?.trim();
    if (!contactId || !normalizedPipelineName) return;

    const contactRepository = (
      await import("@/modules/contacts/contact.repository")
    ).default;
    await contactRepository.updateContactByWorkflow(tenantId, contactId, {
      journeyType: normalizedPipelineName,
    });
  }

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
    await this.syncContactJourneyTypeToPipeline(
      tenantId,
      deal.contactId,
      pipeline.name,
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
    const patch: UpdateDealDto = { ...updates };

    if (
      (patch.status === "WON" || patch.status === "LOST") &&
      patch.stage === undefined
    ) {
      const closing = await dealRepository.getPipelineClosingStageNames(
        existing.pipelineId,
        tenantId,
      );
      if (patch.status === "WON" && closing?.closedWonStageName) {
        patch.stage = closing.closedWonStageName;
      } else if (patch.status === "LOST" && closing?.closedLostStageName) {
        patch.stage = closing.closedLostStageName;
      }
    }

    const pipelineWillChange =
      patch.pipelineId != null && patch.pipelineId !== existing.pipelineId;
    let targetPipelineName: string | null = null;

    if (pipelineWillChange) {
      const pl = await dealRepository.findDefaultPipeline(
        tenantId,
        patch.pipelineId,
      );
      if (!pl || pl.id !== patch.pipelineId) {
        throw createError("Pipeline not found", 404);
      }
      const stageKey = patch.stage ?? existing.stage;
      const resolved = resolveStageOnPipeline(pl.stages, stageKey);
      if (!resolved) {
        throw createError("Stage not found in target pipeline", 400);
      }
      targetPipelineName = pl.name;
      patch.stage = resolved.name;
    }

    if (pipelineWillChange && existing.assignedToId) {
      await executeWorkflowRules(
        {
          trigger: "STAGE_EXIT",
          deal: toDealContext(existing),
          previousStage: existing.stage,
          userId: existing.assignedToId,
        },
        { rulesPipelineId: existing.pipelineId },
      ).catch((err) =>
        logger.error("Workflow execution failed", undefined, {
          dealId: existing.id,
          tenantId: existing.tenantId,
          trigger: "STAGE_EXIT",
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }

    const deal = await dealRepository.createDealRevision(
      id,
      tenantId,
      patch,
      userId,
      editReason ?? null,
    );
    if (!deal) throw createError("Deal not found", 404);

    const pipelineChanged = deal.pipelineId !== existing.pipelineId;
    const stageChanged = deal.stage !== existing.stage;

    if (pipelineChanged && existing.assignedToId) {
      await dealRepository.createNotification(
        existing.assignedToId,
        deal.id,
        deal.name,
        deal.stage,
      );
      const logWorkflowErr = (trigger: string) => (err: unknown) =>
        logger.error("Workflow execution failed", undefined, {
          dealId: deal.id,
          tenantId: deal.tenantId,
          trigger,
          error: err instanceof Error ? err.message : String(err),
        });
      await executeWorkflowRules({
        trigger: "STAGE_ENTER",
        deal: toDealContext(deal),
        previousStage: existing.stage,
        userId: existing.assignedToId,
      }).catch(logWorkflowErr("STAGE_ENTER"));

      await this.syncContactJourneyTypeToPipeline(
        tenantId,
        deal.contactId,
        targetPipelineName,
      );
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
    } else if (stageChanged && existing.assignedToId && !pipelineChanged) {
      await dealRepository.createNotification(
        existing.assignedToId,
        deal.id,
        deal.name,
        deal.stage,
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

    if (patch.status === "WON") {
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
    } else if (patch.status === "LOST") {
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

    const targetPipelineId = data.pipelineId ?? existing.pipelineId;
    const crossPipeline = targetPipelineId !== existing.pipelineId;

    if (!crossPipeline) {
      if (existing.stage === data.stage) {
        return existing;
      }
      const stageStatusPatch = await this.getStageStatusPatch(
        tenantId,
        existing.pipelineId,
        data.stage,
      );
      const deal = await dealRepository.createDealRevision(
        id,
        tenantId,
        { stage: data.stage, ...stageStatusPatch },
        userId,
        null,
      );
      if (!deal) throw createError("Deal not found", 404);
      await this.runPostStageChangeEffectsSamePipeline(
        existing,
        deal,
        data.stage,
      );
      return deal;
    }

    const pl = await dealRepository.findDefaultPipeline(
      tenantId,
      targetPipelineId,
    );
    if (!pl || pl.id !== targetPipelineId) {
      throw createError("Pipeline not found", 404);
    }
    const resolved = resolveStageOnPipeline(pl.stages, data.stage);
    if (!resolved) {
      throw createError("Stage not found in target pipeline", 400);
    }
    const stageStatusPatch = await this.getStageStatusPatch(
      tenantId,
      targetPipelineId,
      resolved.name,
    );

    if (existing.assignedToId) {
      await executeWorkflowRules(
        {
          trigger: "STAGE_EXIT",
          deal: toDealContext(existing),
          previousStage: existing.stage,
          userId: existing.assignedToId,
        },
        { rulesPipelineId: existing.pipelineId },
      ).catch((err) =>
        logger.error("Workflow execution failed", undefined, {
          dealId: existing.id,
          tenantId: existing.tenantId,
          trigger: "STAGE_EXIT",
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }

    const deal = await dealRepository.createDealRevision(
      id,
      tenantId,
      {
        pipelineId: targetPipelineId,
        stage: resolved.name,
        ...stageStatusPatch,
      },
      userId,
      null,
    );
    if (!deal) throw createError("Deal not found", 404);

    await this.runPostPipelineEnterEffects(
      existing,
      deal,
      resolved.name,
      pl.name,
    );
    return deal;
  }

  /**
   * Workflow MOVE_STAGE — revision + notifications + workflows + pipeline transitions,
   * wrapped in nesting depth guard to prevent infinite automation loops.
   */
  async updateStageFromAutomation(
    tenantId: string,
    dealId: string,
    targetStage: string,
    actorUserId: string,
    targetPipelineId?: string,
  ): Promise<void> {
    const existing = await dealRepository.findById(tenantId, dealId);
    if (!existing) return;

    const destPipelineId = targetPipelineId ?? existing.pipelineId;
    const samePipeline = destPipelineId === existing.pipelineId;
    if (samePipeline && existing.stage === targetStage) return;

    await runWithIncreasedWorkflowNestingDepth(async () => {
      if (!samePipeline) {
        const pl = await dealRepository.findDefaultPipeline(
          tenantId,
          destPipelineId,
        );
        if (!pl || pl.id !== destPipelineId) {
          logger.warn(
            "MOVE_STAGE skipped: target pipeline not found",
            undefined,
            {
              dealId,
              tenantId,
              destPipelineId,
            },
          );
          return;
        }
        const resolved = resolveStageOnPipeline(pl.stages, targetStage);
        if (!resolved) {
          logger.warn(
            "MOVE_STAGE skipped: stage not found in target pipeline",
            undefined,
            {
              dealId,
              tenantId,
              destPipelineId,
              targetStage,
            },
          );
          return;
        }
        const stageStatusPatch = await this.getStageStatusPatch(
          tenantId,
          destPipelineId,
          resolved.name,
        );
        if (existing.assignedToId) {
          await executeWorkflowRules(
            {
              trigger: "STAGE_EXIT",
              deal: toDealContext(existing),
              previousStage: existing.stage,
              userId: existing.assignedToId,
            },
            { rulesPipelineId: existing.pipelineId },
          ).catch((err) =>
            logger.error("Workflow execution failed", undefined, {
              dealId: existing.id,
              tenantId: existing.tenantId,
              trigger: "STAGE_EXIT",
              error: err instanceof Error ? err.message : String(err),
            }),
          );
        }
        const deal = await dealRepository.createDealRevision(
          dealId,
          tenantId,
          {
            pipelineId: destPipelineId,
            stage: resolved.name,
            ...stageStatusPatch,
          },
          actorUserId,
          null,
        );
        if (!deal) return;
        await this.runPostPipelineEnterEffects(
          existing,
          deal,
          resolved.name,
          pl.name,
        );
        return;
      }

      const stageStatusPatch = await this.getStageStatusPatch(
        tenantId,
        existing.pipelineId,
        targetStage,
      );
      const deal = await dealRepository.createDealRevision(
        dealId,
        tenantId,
        { stage: targetStage, ...stageStatusPatch },
        actorUserId,
        null,
      );
      if (!deal) return;
      await this.runPostStageChangeEffectsSamePipeline(
        existing,
        deal,
        targetStage,
      );
    });
  }

  private async runPostStageChangeEffectsSamePipeline(
    existing: NonNullable<Awaited<ReturnType<typeof dealRepository.findById>>>,
    deal: NonNullable<
      Awaited<ReturnType<typeof dealRepository.createDealRevision>>
    >,
    newStage: string,
  ): Promise<void> {
    if (!existing.assignedToId) return;

    await dealRepository.createNotification(
      existing.assignedToId,
      deal.id,
      deal.name,
      newStage,
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
    await this.runTerminalStatusEffects(existing, deal);
  }

  /** After cross-pipeline move; STAGE_EXIT for source already ran before revision. */
  private async runPostPipelineEnterEffects(
    existing: NonNullable<Awaited<ReturnType<typeof dealRepository.findById>>>,
    deal: NonNullable<
      Awaited<ReturnType<typeof dealRepository.createDealRevision>>
    >,
    newStage: string,
    pipelineName?: string | null,
  ): Promise<void> {
    await this.syncContactJourneyTypeToPipeline(
      deal.tenantId,
      deal.contactId,
      pipelineName ?? ("pipeline" in deal ? deal.pipeline?.name : undefined),
    );

    if (!existing.assignedToId) return;

    await dealRepository.createNotification(
      existing.assignedToId,
      deal.id,
      deal.name,
      newStage,
    );
    const logWorkflowErr = (trigger: string) => (err: unknown) =>
      logger.error("Workflow execution failed", undefined, {
        dealId: deal.id,
        tenantId: deal.tenantId,
        trigger,
        error: err instanceof Error ? err.message : String(err),
      });
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
    await this.runTerminalStatusEffects(existing, deal);
  }

  private async getStageStatusPatch(
    tenantId: string,
    pipelineId: string,
    stageName: string,
  ): Promise<Pick<UpdateDealDto, "status" | "closedAt">> {
    const closing = await dealRepository.getPipelineClosingStageNames(
      pipelineId,
      tenantId,
    );
    if (closing?.closedWonStageName === stageName) {
      return { status: "WON", closedAt: new Date().toISOString() };
    }
    if (closing?.closedLostStageName === stageName) {
      return { status: "LOST", closedAt: new Date().toISOString() };
    }
    return { status: "OPEN", closedAt: null };
  }

  private async runTerminalStatusEffects(
    existing: NonNullable<Awaited<ReturnType<typeof dealRepository.findById>>>,
    deal: NonNullable<
      Awaited<ReturnType<typeof dealRepository.createDealRevision>>
    >,
  ): Promise<void> {
    if (deal.status === existing.status || !existing.assignedToId) return;

    const trigger =
      deal.status === "WON"
        ? "DEAL_WON"
        : deal.status === "LOST"
          ? "DEAL_LOST"
          : null;
    if (!trigger) return;

    await executeWorkflowRules({
      trigger,
      deal: toDealContext(deal),
      userId: existing.assignedToId,
    }).catch((err) =>
      logger.error("Workflow execution failed", undefined, {
        dealId: deal.id,
        tenantId: deal.tenantId,
        trigger,
        error: err instanceof Error ? err.message : String(err),
      }),
    );

    await pipelineTransitionService
      .handleDealEvent({
        trigger,
        deal: toDealContext(deal),
        userId: existing.assignedToId,
      })
      .catch((err) =>
        logger.error("Pipeline transition failed", undefined, {
          dealId: deal.id,
          trigger,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
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
  companyId: string | null;
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
    companyId: deal.companyId,
    assignedToId: deal.assignedToId,
    createdById: deal.createdById,
  };
}

export default new DealService();
