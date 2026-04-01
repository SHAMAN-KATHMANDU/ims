/**
 * Workflow Engine — Executes workflow rules when deal events occur.
 * Called from deal.service on create, update, updateStage.
 * Uses repositories only; no direct Prisma access.
 */

import type {
  PipelineType,
  WorkflowTrigger,
  WorkflowAction,
} from "@prisma/client";
import workflowRepository from "./workflow.repository";
import taskRepository from "@/modules/tasks/task.repository";
import notificationRepository from "@/modules/notifications/notification.repository";
import dealRepository from "@/modules/deals/deal.repository";
import contactRepository from "@/modules/contacts/contact.repository";
import activityRepository from "@/modules/activities/activity.repository";
import { parseActionConfig } from "./workflow.schema";
import { logger } from "@/config/logger";
import { shouldSkipWorkflowRules } from "./workflow-execution-context";

export interface DealContext {
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
}

export interface WorkflowEvent {
  trigger: WorkflowTrigger;
  deal: DealContext;
  previousStage?: string;
  userId?: string;
}

export interface ExecuteWorkflowRulesOptions {
  /** Load rules for this pipeline instead of `event.deal.pipelineId` (e.g. STAGE_EXIT on source pipeline before cross-pipeline move). */
  rulesPipelineId?: string;
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
  options?: ExecuteWorkflowRulesOptions,
): Promise<void> {
  if (shouldSkipWorkflowRules()) {
    logger.warn(
      "Skipping workflow rules: max nesting depth reached",
      undefined,
      {
        dealId: event.deal.id,
        tenantId: event.deal.tenantId,
        trigger: event.trigger,
      },
    );
    return;
  }

  const rulesPipelineId = options?.rulesPipelineId ?? event.deal.pipelineId;
  const rules = await workflowRepository.findActiveRulesByPipeline(
    event.deal.tenantId,
    rulesPipelineId,
  );

  for (const rule of rules) {
    const ruleWithTrigger = rule as {
      id: string;
      workflowId?: string;
      trigger: WorkflowTrigger;
      triggerStageId: string | null;
      action: WorkflowAction;
      actionConfig: unknown;
      workflow: { pipeline?: { stages: unknown } };
    };
    if (!matchesTrigger(ruleWithTrigger, event)) continue;

    let runId: string | null = null;
    try {
      if (ruleWithTrigger.workflowId) {
        const run = await workflowRepository.createWorkflowRun({
          tenantId: event.deal.tenantId,
          workflowId: ruleWithTrigger.workflowId,
          ruleId: ruleWithTrigger.id,
          trigger: event.trigger,
          action: ruleWithTrigger.action,
          status: "RUNNING",
          entityId: event.deal.id,
          metadata: {
            dealId: event.deal.id,
            pipelineId: event.deal.pipelineId,
            stage: event.deal.stage,
            previousStage: event.previousStage ?? null,
          },
        });
        runId = run.id;
      }
      const config = parseActionConfig(
        ruleWithTrigger.action,
        ruleWithTrigger.actionConfig,
      );
      await executeAction(ruleWithTrigger.action, config, event);
      if (runId && ruleWithTrigger.workflowId) {
        await workflowRepository.markWorkflowRunSucceeded(
          runId,
          ruleWithTrigger.workflowId,
        );
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Workflow rule execution failed";
      try {
        if (runId && ruleWithTrigger.workflowId) {
          await workflowRepository.markWorkflowRunFailed(
            runId,
            ruleWithTrigger.workflowId,
            message,
          );
        }
      } catch (historyError) {
        logger.error("Workflow run history write failed", undefined, {
          workflowId: ruleWithTrigger.workflowId,
          ruleId: ruleWithTrigger.id,
          dealId: event.deal.id,
          tenantId: event.deal.tenantId,
          error:
            historyError instanceof Error
              ? historyError.message
              : String(historyError),
        });
      }
      logger.error("Workflow rule execution failed", undefined, {
        ruleId: ruleWithTrigger.id,
        dealId: event.deal.id,
        tenantId: event.deal.tenantId,
        trigger: event.trigger,
        action: ruleWithTrigger.action,
        error: message,
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
  CREATE_DEAL: import("./workflow.schema").CreateDealConfig;
  UPDATE_CONTACT_FIELD: import("./workflow.schema").UpdateContactFieldConfig;
  APPLY_TAG: import("./workflow.schema").ApplyTagConfig;
  REMOVE_TAG: import("./workflow.schema").RemoveTagConfig;
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

      let dealIdForTask: string | null = deal.id;
      const link = c.taskDealLink;
      if (link?.mode === "OPEN_DEAL_IN_PIPELINE") {
        if (!deal.contactId) {
          logger.warn(
            "CREATE_TASK OPEN_DEAL_IN_PIPELINE skipped: deal has no contact",
            undefined,
            { dealId: deal.id, tenantId: deal.tenantId },
          );
          dealIdForTask = null;
        } else {
          const targetPipelineId =
            link.targetPipelineId ??
            (link.targetPipelineType
              ? await resolvePipelineIdByType(
                  deal.tenantId,
                  link.targetPipelineType as PipelineType,
                )
              : null);
          if (!targetPipelineId) {
            logger.warn(
              "CREATE_TASK OPEN_DEAL_IN_PIPELINE skipped: target pipeline missing",
              undefined,
              { dealId: deal.id, tenantId: deal.tenantId },
            );
            dealIdForTask = null;
            break;
          }
          const open =
            await dealRepository.findLatestOpenDealForContactInPipeline(
              deal.tenantId,
              deal.contactId,
              targetPipelineId,
              link.stageName ?? null,
            );
          if (!open) {
            logger.warn(
              "CREATE_TASK OPEN_DEAL_IN_PIPELINE: no matching open deal; task created without deal",
              undefined,
              {
                contactId: deal.contactId,
                pipelineId: targetPipelineId,
                tenantId: deal.tenantId,
              },
            );
            dealIdForTask = null;
          } else {
            dealIdForTask = open.id;
          }
        }
      }

      await taskRepository.create(
        deal.tenantId,
        {
          title: taskTitle,
          dueDate: dueDate.toISOString(),
          contactId: deal.contactId,
          memberId: deal.memberId,
          dealId: dealIdForTask,
          companyId: c.companyId ?? deal.companyId ?? null,
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
      const { default: dealService } =
        await import("@/modules/deals/deal.service");
      const actorUserId = event.userId ?? deal.createdById ?? deal.assignedToId;
      await dealService.updateStageFromAutomation(
        deal.tenantId,
        deal.id,
        c.targetStageId,
        actorUserId,
        c.targetPipelineId,
      );
      break;
    }

    case "UPDATE_FIELD": {
      const c = config as ActionConfigMap["UPDATE_FIELD"];
      const value = c.value;
      if (value === undefined) return;

      const dateStr =
        value != null && value !== ""
          ? new Date(value as string).toISOString()
          : null;
      await dealRepository.update(deal.id, { expectedCloseDate: dateStr }, "");
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

    case "CREATE_DEAL": {
      const c = config as ActionConfigMap["CREATE_DEAL"];
      const targetPipelineId =
        c.pipelineId ??
        (c.pipelineType
          ? await resolvePipelineIdByType(
              deal.tenantId,
              c.pipelineType as PipelineType,
            )
          : null);
      if (!targetPipelineId) {
        logger.warn("CREATE_DEAL skipped: target pipeline missing", undefined, {
          tenantId: deal.tenantId,
          pipelineId: c.pipelineId,
          pipelineType: c.pipelineType,
        });
        break;
      }
      const pipeline = await dealRepository.findDefaultPipeline(
        deal.tenantId,
        targetPipelineId,
      );
      if (!pipeline || pipeline.id !== targetPipelineId) {
        logger.warn(
          "CREATE_DEAL skipped: pipeline not found or mismatch",
          undefined,
          {
            tenantId: deal.tenantId,
            pipelineId: targetPipelineId,
          },
        );
        break;
      }
      const stages = pipeline.stages;
      let stageName: string;
      if (c.stageId) {
        stageName = resolveStageName(stages, c.stageId);
      } else if (c.stageName) {
        stageName = c.stageName;
      } else if (Array.isArray(stages) && stages.length > 0) {
        const first = stages[0] as { name: string };
        stageName = String(first.name);
      } else {
        stageName = "Qualification";
      }
      const { default: dealService } =
        await import("@/modules/deals/deal.service");
      const actorUserId = event.userId ?? deal.createdById;
      await dealService.create(
        deal.tenantId,
        {
          name: c.title?.trim() || "New deal",
          value: 0,
          stage: stageName,
          contactId: deal.contactId,
          memberId: deal.memberId,
          pipelineId: pipeline.id,
          assignedToId: deal.assignedToId,
        },
        actorUserId,
      );
      break;
    }

    case "UPDATE_CONTACT_FIELD": {
      const c = config as ActionConfigMap["UPDATE_CONTACT_FIELD"];
      if (!deal.contactId) break;
      await contactRepository.updateContactByWorkflow(
        deal.tenantId,
        deal.contactId,
        { source: c.value },
      );
      break;
    }

    case "APPLY_TAG": {
      const c = config as ActionConfigMap["APPLY_TAG"];
      if (!deal.contactId) break;
      await contactRepository.linkExistingTagToContact(
        deal.tenantId,
        deal.contactId,
        c.tag.trim(),
      );
      break;
    }

    case "REMOVE_TAG": {
      const c = config as ActionConfigMap["REMOVE_TAG"];
      if (!deal.contactId) break;
      await contactRepository.unlinkTagFromContact(
        deal.tenantId,
        deal.contactId,
        c.tag.trim(),
      );
      break;
    }

    default:
      break;
  }
}

async function resolvePipelineIdByType(
  tenantId: string,
  pipelineType: PipelineType,
): Promise<string | null> {
  const pipeline = await dealRepository.findPipelineByType(
    tenantId,
    pipelineType,
  );
  return pipeline?.id ?? null;
}
