/**
 * Cross-Pipeline Transition Service
 *
 * Handles automatic deal creation across pipelines when deals are won/lost
 * or when contacts reach specific stages in the CRM framework pipelines.
 */

import type { PipelineType } from "@prisma/client";
import prisma from "@/config/prisma";
import { logger } from "@/config/logger";
import contactRepository from "@/modules/contacts/contact.repository";
import remarketingService from "@/modules/remarketing/remarketing.service";
import type {
  DealContext,
  WorkflowEvent,
} from "@/modules/workflows/workflow.engine";

interface TransitionResult {
  transitioned: boolean;
  targetDealId?: string;
  targetPipeline?: string;
  targetStage?: string;
}

export class PipelineTransitionService {
  /**
   * Handle deal lifecycle events and create cross-pipeline transitions.
   * Called from deal.service after executeWorkflowRules.
   */
  async handleDealEvent(event: WorkflowEvent): Promise<TransitionResult> {
    const pipeline = await prisma.pipeline.findUnique({
      where: { id: event.deal.pipelineId },
      select: { type: true, tenantId: true },
    });

    if (!pipeline || pipeline.type === "GENERAL") {
      return { transitioned: false };
    }

    const pipelineType = pipeline.type;
    const trigger = event.trigger;

    try {
      if (pipelineType === "NEW_SALES" && trigger === "DEAL_WON") {
        return this.handleNewSalesWon(event.deal);
      }
      if (pipelineType === "NEW_SALES" && trigger === "DEAL_LOST") {
        return this.handleNewSalesLost(event.deal);
      }
      if (pipelineType === "REMARKETING" && trigger === "STAGE_ENTER") {
        return this.handleRemarketingStageEnter(event.deal);
      }
      if (pipelineType === "REPURCHASE" && trigger === "DEAL_WON") {
        return this.handleRepurchaseWon(event.deal);
      }
      if (pipelineType === "REPURCHASE" && trigger === "DEAL_LOST") {
        return this.handleRepurchaseLost(event.deal);
      }
    } catch (err) {
      logger.error("Pipeline transition failed", undefined, {
        dealId: event.deal.id,
        pipelineType,
        trigger,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return { transitioned: false };
  }

  /**
   * New Sales Closed Won -> Remarketing R1 (Post-Purchase Follow-up)
   * - purchaseCount already incremented by deal.service/sale.service
   */
  private async handleNewSalesWon(
    deal: DealContext,
  ): Promise<TransitionResult> {
    if (!deal.contactId) return { transitioned: false };

    const remarketingPipeline = await this.findPipelineByType(
      deal.tenantId,
      "REMARKETING",
    );
    if (!remarketingPipeline) return { transitioned: false };

    const firstStage = this.getStageByName(
      remarketingPipeline.stages,
      "Post-Purchase Follow-up",
    );
    if (!firstStage) return { transitioned: false };

    const newDeal = await this.createDealInPipeline({
      tenantId: deal.tenantId,
      contactId: deal.contactId,
      memberId: deal.memberId,
      pipelineId: remarketingPipeline.id,
      stage: firstStage.name,
      probability: firstStage.probability ?? 20,
      assignedToId: deal.assignedToId,
      createdById: deal.createdById,
      name: `Remarketing — Post-Purchase`,
    });

    await remarketingService
      .createSequenceForDeal(
        deal.tenantId,
        deal.contactId!,
        newDeal.id,
        "Post-Purchase Follow-up",
      )
      .catch((err) =>
        logger.error("Failed to create remarketing sequence", undefined, {
          error: String(err),
        }),
      );

    return {
      transitioned: true,
      targetDealId: newDeal.id,
      targetPipeline: "REMARKETING",
      targetStage: firstStage.name,
    };
  }

  /**
   * New Sales Closed Lost -> Remarketing R2 (Dormant)
   * - Apply tag "Re-engage"
   * - Create follow-up task in 30 days
   */
  private async handleNewSalesLost(
    deal: DealContext,
  ): Promise<TransitionResult> {
    if (!deal.contactId) return { transitioned: false };

    const remarketingPipeline = await this.findPipelineByType(
      deal.tenantId,
      "REMARKETING",
    );
    if (!remarketingPipeline) return { transitioned: false };

    const dormantStage = this.getStageByName(
      remarketingPipeline.stages,
      "Dormant",
    );
    if (!dormantStage) return { transitioned: false };

    await this.updateContactJourneyAndTags(deal.contactId, {
      addTags: ["Re-engage"],
    });

    const newDeal = await this.createDealInPipeline({
      tenantId: deal.tenantId,
      contactId: deal.contactId,
      memberId: deal.memberId,
      pipelineId: remarketingPipeline.id,
      stage: dormantStage.name,
      probability: dormantStage.probability ?? 5,
      assignedToId: deal.assignedToId,
      createdById: deal.createdById,
      name: `Remarketing — Re-engage`,
    });

    // Create follow-up task in 30 days
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    await prisma.task.create({
      data: {
        tenantId: deal.tenantId,
        title: `Follow up with lost lead (from New Sales)`,
        dueDate,
        contactId: deal.contactId,
        dealId: newDeal.id,
        assignedToId: deal.assignedToId,
      },
    });

    await remarketingService
      .createSequenceForDeal(
        deal.tenantId,
        deal.contactId!,
        newDeal.id,
        "Dormant",
      )
      .catch((err) =>
        logger.error("Failed to create remarketing sequence", undefined, {
          error: String(err),
        }),
      );

    return {
      transitioned: true,
      targetDealId: newDeal.id,
      targetPipeline: "REMARKETING",
      targetStage: dormantStage.name,
    };
  }

  /**
   * Remarketing R5 (Purchase Intent) -> Repurchase P1 (Returned)
   * - Apply tag "Hot Lead"
   * - Pause remarketing sequences
   */
  private async handleRemarketingStageEnter(
    deal: DealContext,
  ): Promise<TransitionResult> {
    if (!deal.contactId) return { transitioned: false };

    const remarketingPipeline = await prisma.pipeline.findUnique({
      where: { id: deal.pipelineId },
      select: { stages: true },
    });
    const purchaseIntentStage = this.getStageByName(
      remarketingPipeline?.stages,
      "Purchase Intent",
    );
    if (!purchaseIntentStage || deal.stage !== purchaseIntentStage.name) {
      return { transitioned: false };
    }

    // Check one-active-deal rule for Repurchase
    const hasOpenRepurchase = await this.hasOpenDealInPipelineType(
      deal.tenantId,
      deal.contactId,
      "REPURCHASE",
    );
    if (hasOpenRepurchase) return { transitioned: false };

    const repurchasePipeline = await this.findPipelineByType(
      deal.tenantId,
      "REPURCHASE",
    );
    if (!repurchasePipeline) return { transitioned: false };

    const returnedStage = this.getStageByName(
      repurchasePipeline.stages,
      "Returned",
    );
    if (!returnedStage) return { transitioned: false };

    await this.updateContactJourneyAndTags(deal.contactId, {
      addTags: ["Hot Lead"],
    });

    // Pause remarketing sequences
    await prisma.remarketingSequence.updateMany({
      where: {
        contactId: deal.contactId,
        status: "PENDING",
      },
      data: { status: "PAUSED" },
    });

    const newDeal = await this.createDealInPipeline({
      tenantId: deal.tenantId,
      contactId: deal.contactId,
      memberId: deal.memberId,
      pipelineId: repurchasePipeline.id,
      stage: returnedStage.name,
      probability: returnedStage.probability ?? 30,
      assignedToId: deal.assignedToId,
      createdById: deal.createdById,
      name: `Repurchase — Returning Customer`,
    });

    return {
      transitioned: true,
      targetDealId: newDeal.id,
      targetPipeline: "REPURCHASE",
      targetStage: returnedStage.name,
    };
  }

  /**
   * Repurchase Closed Won -> Remarketing R1 (Post-Purchase Follow-up)
   * - Increment purchaseCount
   * - Auto-tag VIP if count >= 3
   * - Update journey type
   */
  private async handleRepurchaseWon(
    deal: DealContext,
  ): Promise<TransitionResult> {
    if (!deal.contactId) return { transitioned: false };

    const remarketingPipeline = await this.findPipelineByType(
      deal.tenantId,
      "REMARKETING",
    );
    if (!remarketingPipeline) return { transitioned: false };

    const firstStage = this.getStageByName(
      remarketingPipeline.stages,
      "Post-Purchase Follow-up",
    );
    if (!firstStage) return { transitioned: false };

    // Increment purchase count and apply loyalty tier
    await prisma.contact.update({
      where: { id: deal.contactId },
      data: { purchaseCount: { increment: 1 } },
      select: { id: true, purchaseCount: true },
    });

    const { applyLoyaltyTier } =
      await import("@/modules/contacts/loyalty.service");
    await applyLoyaltyTier(deal.contactId!);

    // Resume paused remarketing sequences
    await prisma.remarketingSequence.updateMany({
      where: { contactId: deal.contactId, status: "PAUSED" },
      data: { status: "PENDING" },
    });

    const newDeal = await this.createDealInPipeline({
      tenantId: deal.tenantId,
      contactId: deal.contactId,
      memberId: deal.memberId,
      pipelineId: remarketingPipeline.id,
      stage: firstStage.name,
      probability: firstStage.probability ?? 20,
      assignedToId: deal.assignedToId,
      createdById: deal.createdById,
      name: `Remarketing — Post-Purchase`,
    });

    await remarketingService
      .createSequenceForDeal(
        deal.tenantId,
        deal.contactId!,
        newDeal.id,
        "Post-Purchase Follow-up",
      )
      .catch((err) =>
        logger.error("Failed to create remarketing sequence", undefined, {
          error: String(err),
        }),
      );

    return {
      transitioned: true,
      targetDealId: newDeal.id,
      targetPipeline: "REMARKETING",
      targetStage: firstStage.name,
    };
  }

  /**
   * Repurchase Closed Lost -> Remarketing R2 (Dormant, resume from Day 14)
   */
  private async handleRepurchaseLost(
    deal: DealContext,
  ): Promise<TransitionResult> {
    if (!deal.contactId) return { transitioned: false };

    const remarketingPipeline = await this.findPipelineByType(
      deal.tenantId,
      "REMARKETING",
    );
    if (!remarketingPipeline) return { transitioned: false };

    const dormantStage = this.getStageByName(
      remarketingPipeline.stages,
      "Dormant",
    );
    if (!dormantStage) return { transitioned: false };

    // Resume paused remarketing sequences
    await prisma.remarketingSequence.updateMany({
      where: { contactId: deal.contactId, status: "PAUSED" },
      data: { status: "PENDING" },
    });

    const newDeal = await this.createDealInPipeline({
      tenantId: deal.tenantId,
      contactId: deal.contactId,
      memberId: deal.memberId,
      pipelineId: remarketingPipeline.id,
      stage: dormantStage.name,
      probability: dormantStage.probability ?? 5,
      assignedToId: deal.assignedToId,
      createdById: deal.createdById,
      name: `Remarketing — Re-engage (from Repurchase)`,
    });

    // Start from Day 14 (skip Day 7) since they already went through Repurchase
    await remarketingService
      .createSequenceForDeal(
        deal.tenantId,
        deal.contactId!,
        newDeal.id,
        "Dormant",
        true,
      )
      .catch((err) =>
        logger.error("Failed to create remarketing sequence", undefined, {
          error: String(err),
        }),
      );

    return {
      transitioned: true,
      targetDealId: newDeal.id,
      targetPipeline: "REMARKETING",
      targetStage: dormantStage.name,
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private async findPipelineByType(tenantId: string, type: PipelineType) {
    return prisma.pipeline.findFirst({
      where: { tenantId, type, deletedAt: null },
      select: { id: true, stages: true },
    });
  }

  private getStageByName(
    stages: unknown,
    name: string,
  ): { name: string; probability?: number } | null {
    if (!stages || !Array.isArray(stages)) return null;
    return (
      (stages as Array<{ name: string; probability?: number }>).find(
        (s) => s.name === name,
      ) ?? null
    );
  }

  private async hasOpenDealInPipelineType(
    tenantId: string,
    contactId: string,
    pipelineType: PipelineType,
  ): Promise<boolean> {
    const count = await prisma.deal.count({
      where: {
        tenantId,
        contactId,
        status: "OPEN",
        deletedAt: null,
        isLatest: true,
        pipeline: { type: pipelineType },
      },
    });
    return count > 0;
  }

  private async createDealInPipeline(data: {
    tenantId: string;
    contactId: string;
    memberId: string | null;
    pipelineId: string;
    stage: string;
    probability: number;
    assignedToId: string;
    createdById: string;
    name: string;
  }) {
    const { default: dealService } =
      await import("@/modules/deals/deal.service");
    return dealService.create(
      data.tenantId,
      {
        name: data.name,
        value: 0,
        stage: data.stage,
        probability: data.probability,
        contactId: data.contactId,
        memberId: data.memberId,
        pipelineId: data.pipelineId,
        assignedToId: data.assignedToId,
      },
      data.createdById,
    );
  }

  private async updateContactJourneyAndTags(
    contactId: string,
    updates: {
      addTags?: string[];
      removeTags?: string[];
    },
  ) {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: { tenantId: true },
    });
    if (!contact) return;

    if (updates.addTags?.length) {
      for (const tagName of updates.addTags) {
        await contactRepository.linkExistingTagToContact(
          contact.tenantId,
          contactId,
          tagName,
        );
      }
    }

    if (updates.removeTags?.length) {
      for (const tagName of updates.removeTags) {
        await contactRepository.unlinkTagFromContact(
          contact.tenantId,
          contactId,
          tagName,
        );
      }
    }
  }
}

export default new PipelineTransitionService();
