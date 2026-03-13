/**
 * Workflow Engine — Executes workflow rules when deal events occur.
 * Called from deal.service on create, update, updateStage.
 * Uses repositories only; no direct Prisma access.
 */

import type { WorkflowTrigger, WorkflowAction } from "@prisma/client";
import workflowRepository from "./workflow.repository";
import taskRepository from "@/modules/tasks/task.repository";
import notificationRepository from "@/modules/notifications/notification.repository";
import dealRepository from "@/modules/deals/deal.repository";
import activityRepository from "@/modules/activities/activity.repository";
import { parseActionConfig } from "./workflow.schema";
import { logger } from "@/config/logger";

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

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resolveStageName(stages: unknown, triggerStageId: string): string {
  if (!stages || !Array.isArray(stages)) return triggerStageId;
  const isUuid = UUID_REGEX.test(triggerStageId);
  const stage = (stages as Array<{ id?: string; name: string }>).find((s) =>
    isUuid
      ? s.id === triggerStageId
      : s.name && String(s.name) === triggerStageId,
  );
  return stage?.name ?? triggerStageId;
}

export async function executeWorkflowRules(
  event: WorkflowEvent,
): Promise<void> {
  const rules = await workflowRepository.findActiveRulesByPipeline(
    event.deal.tenantId,
    event.deal.pipelineId,
  );

  for (const rule of rules) {
    const ruleWithTrigger = rule as {
      id: string;
      trigger: WorkflowTrigger;
      triggerStageId: string | null;
      action: WorkflowAction;
      actionConfig: unknown;
      workflow: { pipeline?: { stages: unknown } };
    };
    if (!matchesTrigger(ruleWithTrigger, event)) continue;

    try {
      const config = parseActionConfig(
        ruleWithTrigger.action,
        ruleWithTrigger.actionConfig,
      );
      await executeAction(ruleWithTrigger.action, config, event);
    } catch (err) {
      logger.error("Workflow rule execution failed", undefined, {
        ruleId: ruleWithTrigger.id,
        dealId: event.deal.id,
        tenantId: event.deal.tenantId,
        trigger: event.trigger,
        action: ruleWithTrigger.action,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

function matchesTrigger(
  rule: {
    trigger: WorkflowTrigger;
    triggerStageId: string | null;
    workflow?: { pipeline?: { stages: unknown } };
  },
  event: WorkflowEvent,
): boolean {
  if (rule.trigger !== event.trigger) return false;

  if (
    (rule.trigger === "STAGE_ENTER" || rule.trigger === "STAGE_EXIT") &&
    rule.triggerStageId
  ) {
    const stageToCheck =
      rule.trigger === "STAGE_ENTER" ? event.deal.stage : event.previousStage;
    const stages = rule.workflow?.pipeline?.stages;
    const resolvedRuleStage = resolveStageName(stages, rule.triggerStageId);
    return stageToCheck === resolvedRuleStage;
  }

  return true;
}

type ActionConfigMap = {
  CREATE_TASK: import("./workflow.schema").CreateTaskConfig;
  SEND_NOTIFICATION: import("./workflow.schema").SendNotificationConfig;
  MOVE_STAGE: import("./workflow.schema").MoveStageConfig;
  UPDATE_FIELD: import("./workflow.schema").UpdateFieldConfig;
  CREATE_ACTIVITY: import("./workflow.schema").CreateActivityConfig;
};

async function executeAction(
  action: WorkflowAction,
  config: ActionConfigMap[WorkflowAction],
  event: WorkflowEvent,
): Promise<void> {
  const { deal } = event;

  switch (action) {
    case "CREATE_TASK": {
      const c = config as ActionConfigMap["CREATE_TASK"];
      const taskTitle = c.taskTitle ?? "Follow up";
      const dueDateDays = c.dueDateDays ?? 1;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + dueDateDays);
      const assigneeId = c.assigneeId ?? deal.assignedToId;

      await taskRepository.create(
        deal.tenantId,
        {
          title: taskTitle,
          dueDate: dueDate.toISOString(),
          contactId: deal.contactId,
          memberId: deal.memberId,
          dealId: deal.id,
          assignedToId: assigneeId,
        },
        assigneeId,
      );
      break;
    }

    case "SEND_NOTIFICATION": {
      const c = config as ActionConfigMap["SEND_NOTIFICATION"];
      const title = c.title ?? "Deal update";
      const message = c.message ?? "";
      const userId = c.userId ?? deal.assignedToId;

      await notificationRepository.create({
        userId,
        type: "DEAL_STAGE_CHANGE",
        title,
        message,
        resourceType: "deal",
        resourceId: deal.id,
      });
      break;
    }

    case "MOVE_STAGE": {
      const c = config as ActionConfigMap["MOVE_STAGE"];
      await dealRepository.updateStage(deal.id, c.targetStageId, deal.tenantId);
      break;
    }

    case "UPDATE_FIELD": {
      const c = config as ActionConfigMap["UPDATE_FIELD"];
      const value = c.value;
      if (value === undefined) return;

      if (c.field === "probability") {
        const num = typeof value === "number" ? value : Number(value);
        if (!Number.isFinite(num)) return;
        await dealRepository.update(
          deal.id,
          { probability: Math.min(100, Math.max(0, num)) },
          "",
        );
      } else {
        const dateStr =
          value != null && value !== ""
            ? new Date(value as string).toISOString()
            : null;
        await dealRepository.update(
          deal.id,
          { expectedCloseDate: dateStr },
          "",
        );
      }
      break;
    }

    case "CREATE_ACTIVITY": {
      const c = config as ActionConfigMap["CREATE_ACTIVITY"];
      const type = c.type ?? "CALL";
      const subject = c.subject ?? null;
      const notes = c.notes ?? null;

      await activityRepository.create({
        tenantId: deal.tenantId,
        type,
        subject,
        notes,
        activityAt: new Date(),
        contactId: deal.contactId,
        memberId: deal.memberId,
        dealId: deal.id,
        createdById: deal.createdById,
      });
      break;
    }

    default:
      break;
  }
}
