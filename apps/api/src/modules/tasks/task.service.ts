import { createError } from "@/middlewares/errorHandler";
import { createDeleteAuditLog } from "@/shared/audit/createDeleteAuditLog";
import { logger } from "@/config/logger";
import automationService from "@/modules/automation/automation.service";
import taskRepository from "./task.repository";
import type { CreateTaskDto, UpdateTaskDto } from "./task.schema";

export class TaskService {
  async create(tenantId: string, data: CreateTaskDto, userId: string) {
    const task = await taskRepository.create(tenantId, data, userId);

    if (task.dueDate && task.assignedToId) {
      await taskRepository.createNotification(
        task.assignedToId,
        task.id,
        task.title,
        task.dueDate,
      );
    }

    await automationService
      .publishDomainEvent({
        tenantId,
        eventName: "workitems.created",
        scopeType: "GLOBAL",
        entityType: "WORK_ITEM",
        entityId: task.id,
        actorUserId: userId,
        dedupeKey: `workitem-created:${task.id}`,
        payload: {
          taskId: task.id,
          title: task.title,
          assignedToId: task.assignedToId,
          dueDate: task.dueDate?.toISOString() ?? null,
          contactId: task.contactId ?? null,
          memberId: task.memberId ?? null,
          dealId: task.dealId ?? null,
          companyId: task.companyId ?? null,
          priority: task.priority,
          status: task.status,
          completed: task.completed,
        },
      })
      .catch((error) => {
        logger.error("Automation event publishing failed", undefined, {
          tenantId,
          taskId: task.id,
          eventName: "workitems.created",
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return task;
  }

  async getAll(tenantId: string, query: Record<string, unknown>) {
    return taskRepository.findAll(tenantId, query);
  }

  async getById(tenantId: string, id: string) {
    const task = await taskRepository.findById(tenantId, id);
    if (!task) throw createError("Task not found", 404);
    return task;
  }

  async update(tenantId: string, id: string, data: UpdateTaskDto) {
    const existing = await taskRepository.findById(tenantId, id);
    if (!existing) throw createError("Task not found", 404);
    return taskRepository.update(id, data, existing);
  }

  async complete(tenantId: string, id: string, userId?: string) {
    const existing = await taskRepository.findById(tenantId, id);
    if (!existing) throw createError("Task not found", 404);
    const task = await taskRepository.complete(id);

    await automationService
      .publishDomainEvent({
        tenantId,
        eventName: "workitems.completed",
        scopeType: "GLOBAL",
        entityType: "WORK_ITEM",
        entityId: task.id,
        actorUserId: userId ?? null,
        dedupeKey: `workitem-completed:${task.id}`,
        payload: {
          taskId: task.id,
          title: task.title,
          assignedToId: task.assignedToId,
          dueDate: task.dueDate?.toISOString() ?? null,
          contactId: task.contactId ?? null,
          memberId: task.memberId ?? null,
          dealId: task.dealId ?? null,
          companyId: task.companyId ?? null,
          priority: task.priority,
          status: task.status,
          completed: task.completed,
        },
      })
      .catch((error) => {
        logger.error("Automation event publishing failed", undefined, {
          tenantId,
          taskId: task.id,
          eventName: "workitems.completed",
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return task;
  }

  async bulkComplete(tenantId: string, ids: string[]) {
    if (ids.length === 0) return { count: 0 };
    return taskRepository.completeMany(tenantId, ids);
  }

  async bulkDelete(
    tenantId: string,
    ids: string[],
    ctx: { userId: string; reason?: string; ip?: string; userAgent?: string },
  ) {
    if (ids.length === 0) return { count: 0 };
    const validIds = await taskRepository.findIdsForTenant(tenantId, ids);
    if (validIds.length === 0) return { count: 0 };
    await taskRepository.softDeleteMany(tenantId, validIds, {
      deletedBy: ctx.userId,
      deleteReason: ctx.reason ?? null,
    });
    for (const id of validIds) {
      await createDeleteAuditLog({
        userId: ctx.userId,
        tenantId,
        resource: "Task",
        resourceId: id,
        deleteReason: ctx.reason ?? undefined,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
    }
    return { count: validIds.length };
  }

  async delete(
    tenantId: string,
    id: string,
    ctx: { userId: string; reason?: string; ip?: string; userAgent?: string },
  ) {
    const existing = await taskRepository.findById(tenantId, id);
    if (!existing) throw createError("Task not found", 404);
    await taskRepository.softDelete(id, {
      deletedBy: ctx.userId,
      deleteReason: ctx.reason ?? null,
    });
    await createDeleteAuditLog({
      userId: ctx.userId,
      tenantId,
      resource: "Task",
      resourceId: id,
      deleteReason: ctx.reason ?? undefined,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }
}

export default new TaskService();
