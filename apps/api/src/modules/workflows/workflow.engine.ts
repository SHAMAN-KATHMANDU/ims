/**
 * Workflow Engine — Executes workflow rules when deal events occur.
 * Called from deal.service on create, update, updateStage.
 */

import prisma from "@/config/prisma";
import type { WorkflowTrigger, WorkflowAction } from "@prisma/client";

export interface DealContext {
  id: string;
  tenantId: string;
  pipelineId: string;
  stage: string;
  status: string;
  contactId: string | null;
  memberId: string | null;
  assignedToId: string;
  createdById: string;
}

export interface WorkflowEvent {
  trigger: WorkflowTrigger;
  deal: DealContext;
  previousStage?: string;
  userId?: string;
}

export async function executeWorkflowRules(
  event: WorkflowEvent,
): Promise<void> {
  const rules = await prisma.workflowRule.findMany({
    where: {
      workflow: {
        tenantId: event.deal.tenantId,
        pipelineId: event.deal.pipelineId,
        isActive: true,
      },
    },
    include: { workflow: true },
    orderBy: [{ workflowId: "asc" }, { ruleOrder: "asc" }],
  });

  for (const rule of rules) {
    if (!matchesTrigger(rule, event)) continue;

    try {
      await executeAction(
        rule.action,
        rule.actionConfig as Record<string, unknown>,
        event,
      );
    } catch (err) {
      // Log but don't fail the deal operation
      console.error(`[WorkflowEngine] Rule ${rule.id} failed:`, err);
    }
  }
}

function matchesTrigger(
  rule: { trigger: WorkflowTrigger; triggerStageId: string | null },
  event: WorkflowEvent,
): boolean {
  if (rule.trigger !== event.trigger) return false;

  if (
    (rule.trigger === "STAGE_ENTER" || rule.trigger === "STAGE_EXIT") &&
    rule.triggerStageId
  ) {
    const stageToCheck =
      rule.trigger === "STAGE_ENTER" ? event.deal.stage : event.previousStage;
    return stageToCheck === rule.triggerStageId;
  }

  return true;
}

async function executeAction(
  action: WorkflowAction,
  config: Record<string, unknown>,
  event: WorkflowEvent,
): Promise<void> {
  const { deal } = event;

  switch (action) {
    case "CREATE_TASK": {
      const taskTitle = (config.taskTitle as string) ?? "Follow up";
      const dueDateDays = (config.dueDateDays as number) ?? 1;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + dueDateDays);
      const assigneeId = (config.assigneeId as string) || deal.assignedToId;

      await prisma.task.create({
        data: {
          tenantId: deal.tenantId,
          title: taskTitle,
          dueDate,
          contactId: deal.contactId,
          memberId: deal.memberId,
          dealId: deal.id,
          assignedToId: assigneeId,
        },
      });
      break;
    }

    case "SEND_NOTIFICATION": {
      const title = (config.title as string) ?? "Deal update";
      const message = (config.message as string) ?? "";
      const userId = (config.userId as string) || deal.assignedToId;

      await prisma.notification.create({
        data: {
          userId,
          type: "DEAL_STAGE_CHANGE",
          title,
          message,
          resourceType: "deal",
          resourceId: deal.id,
        },
      });
      break;
    }

    case "MOVE_STAGE": {
      const targetStageId = config.targetStageId as string;
      if (!targetStageId) return;

      await prisma.deal.update({
        where: { id: deal.id },
        data: { stage: targetStageId },
      });
      break;
    }

    case "UPDATE_FIELD": {
      const field = config.field as string;
      const value = config.value as unknown;
      if (!field || value === undefined) return;

      const allowedFields = ["probability", "expectedCloseDate"];
      if (!allowedFields.includes(field)) return;

      const updateData: Record<string, unknown> = {};
      if (field === "probability") updateData.probability = Number(value);
      if (field === "expectedCloseDate")
        updateData.expectedCloseDate = value ? new Date(value as string) : null;

      if (Object.keys(updateData).length > 0) {
        await prisma.deal.update({
          where: { id: deal.id },
          data: updateData,
        });
      }
      break;
    }

    case "CREATE_ACTIVITY": {
      const type = ((config.type as string) ?? "CALL") as
        | "CALL"
        | "EMAIL"
        | "MEETING";
      const subject = (config.subject as string) ?? null;
      const notes = (config.notes as string) ?? null;

      await prisma.activity.create({
        data: {
          tenantId: deal.tenantId,
          type,
          subject,
          notes,
          activityAt: new Date(),
          contactId: deal.contactId,
          memberId: deal.memberId,
          dealId: deal.id,
          createdById: deal.createdById,
        },
      });
      break;
    }

    default:
      break;
  }
}
