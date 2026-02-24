/**
 * Tasks service - business logic for tasks module.
 */

import type { Prisma } from "@prisma/client";
import { NotFoundError } from "@/shared/errors";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import { tasksRepository } from "./tasks.repository";
import { notificationsRepository } from "@/modules/notifications/notifications.repository";

const ALLOWED_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "dueDate",
  "title",
  "id",
] as const;

export interface TaskListFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  completed?: boolean;
  assignedToId?: string;
  dueToday?: boolean;
}

export interface CreateTaskInput {
  title: string;
  dueDate?: string | Date | null;
  contactId?: string | null;
  memberId?: string | null;
  dealId?: string | null;
  assignedToId?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  dueDate?: string | Date | null;
  completed?: boolean;
  contactId?: string | null;
  memberId?: string | null;
  dealId?: string | null;
  assignedToId?: string | null;
}

export const tasksService = {
  async create(tenantId: string, userId: string, input: CreateTaskInput) {
    const assignedToId = input.assignedToId ?? userId;
    const task = await tasksRepository.createTask({
      tenant: { connect: { id: tenantId } },
      title: input.title,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      contact: input.contactId
        ? { connect: { id: input.contactId } }
        : undefined,
      member: input.memberId ? { connect: { id: input.memberId } } : undefined,
      deal: input.dealId ? { connect: { id: input.dealId } } : undefined,
      assignedTo: { connect: { id: assignedToId } },
    });

    if (task.dueDate && task.assignedToId) {
      await notificationsRepository.create({
        user: { connect: { id: task.assignedToId } },
        type: "TASK_DUE",
        title: "Task due",
        message: `Task "${task.title}" is due ${task.dueDate.toLocaleDateString()}`,
        resourceType: "task",
        resourceId: task.id,
      });
    }

    return task;
  },

  async getAll(tenantId: string, filters: TaskListFilters) {
    const { page, limit, sortBy, sortOrder, search } =
      getPaginationParams(filters);
    const { completed, assignedToId, dueToday } = filters;

    const orderBy = getPrismaOrderBy(sortBy, sortOrder, [
      ...ALLOWED_SORT_FIELDS,
    ]) ?? {
      dueDate: "asc",
    };

    const where: Prisma.TaskWhereInput = { tenantId, deletedAt: null };
    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }
    if (completed !== undefined) where.completed = completed;
    if (assignedToId) where.assignedToId = assignedToId;
    if (dueToday) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      where.dueDate = { gte: today, lt: tomorrow };
    }

    const skip = (page - 1) * limit;
    const [totalItems, tasks] = await Promise.all([
      tasksRepository.countTasks(where),
      tasksRepository.findTasks({ where, orderBy, skip, take: limit }),
    ]);

    return createPaginationResult(tasks, totalItems, page, limit);
  },

  async getById(id: string, tenantId: string) {
    const task = await tasksRepository.findTaskById(id, tenantId);
    if (!task) throw new NotFoundError("Task not found");
    return task;
  },

  async update(id: string, tenantId: string, input: UpdateTaskInput) {
    const existing = await tasksRepository.findTaskByIdForUpdate(id, tenantId);
    if (!existing) throw new NotFoundError("Task not found");

    const data: Prisma.TaskUpdateInput = {};
    if (input.title !== undefined) data.title = input.title || existing.title;
    if (input.dueDate !== undefined) {
      data.dueDate = input.dueDate ? new Date(input.dueDate) : null;
    }
    if (input.completed !== undefined) data.completed = !!input.completed;
    if (input.contactId !== undefined) {
      data.contact = input.contactId
        ? { connect: { id: input.contactId } }
        : { disconnect: true };
    }
    if (input.memberId !== undefined) {
      data.member = input.memberId
        ? { connect: { id: input.memberId } }
        : { disconnect: true };
    }
    if (input.dealId !== undefined) {
      data.deal = input.dealId
        ? { connect: { id: input.dealId } }
        : { disconnect: true };
    }
    if (input.assignedToId !== undefined) {
      data.assignedTo = { connect: { id: input.assignedToId } };
    }

    return tasksRepository.updateTask(id, data);
  },

  async complete(id: string, tenantId: string) {
    const existing = await tasksRepository.findTaskByIdForUpdate(id, tenantId);
    if (!existing) throw new NotFoundError("Task not found");
    return tasksRepository.updateTask(id, { completed: true });
  },

  async delete(id: string, tenantId: string) {
    const existing = await tasksRepository.findTaskByIdForUpdate(id, tenantId);
    if (!existing) throw new NotFoundError("Task not found");
    await tasksRepository.softDeleteTask(id);
  },
};
