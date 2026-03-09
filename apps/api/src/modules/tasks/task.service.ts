import { createError } from "@/middlewares/errorHandler";
import { createDeleteAuditLog } from "@/shared/audit/createDeleteAuditLog";
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

  async complete(tenantId: string, id: string) {
    const existing = await taskRepository.findById(tenantId, id);
    if (!existing) throw createError("Task not found", 404);
    return taskRepository.complete(id);
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
