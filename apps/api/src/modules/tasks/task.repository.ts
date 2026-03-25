import type { TaskWorkflowStatus } from "@prisma/client";
import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import type { CreateTaskDto, UpdateTaskDto } from "./task.schema";

const TASK_INCLUDE = {
  contact: { select: { id: true, firstName: true, lastName: true } },
  member: { select: { id: true, name: true, phone: true } },
  deal: { select: { id: true, name: true } },
  company: { select: { id: true, name: true } },
  assignedTo: { select: { id: true, username: true } },
} as const;

const TASK_DETAIL_INCLUDE = {
  contact: true,
  member: true,
  deal: true,
  company: true,
  assignedTo: { select: { id: true, username: true } },
} as const;

export class TaskRepository {
  async findAll(tenantId: string, query: Record<string, unknown>) {
    const { page, limit, sortBy, sortOrder, search } =
      getPaginationParams(query);
    const completed = query.completed as string | undefined;
    const assignedToId = query.assignedToId as string | undefined;
    const dueToday = query.dueToday === "true";
    const contactId = query.contactId as string | undefined;
    const dealId = query.dealId as string | undefined;
    const orphaned = query.orphaned === "true";

    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "dueDate",
      "title",
      "id",
    ];
    const orderBy = getPrismaOrderBy(sortBy, sortOrder, allowedSortFields) || {
      dueDate: "asc",
    };

    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (search) where.title = { contains: search, mode: "insensitive" };
    if (completed === "true") where.completed = true;
    else if (completed === "false") where.completed = false;
    if (assignedToId) where.assignedToId = assignedToId;
    if (contactId) where.contactId = contactId;
    if (dealId) where.dealId = dealId;
    if (orphaned) where.contactId = null;

    if (dueToday) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      where.dueDate = { gte: today, lt: tomorrow };
    }

    const skip = (page - 1) * limit;

    const [totalItems, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: TASK_INCLUDE,
      }),
    ]);

    return createPaginationResult(tasks, totalItems, page, limit);
  }

  async findById(tenantId: string, id: string) {
    return prisma.task.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: TASK_DETAIL_INCLUDE,
    });
  }

  async create(tenantId: string, data: CreateTaskDto, userId: string) {
    const completed = data.status === "DONE";
    return prisma.task.create({
      data: {
        tenantId,
        title: data.title.trim(),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        contactId: data.contactId || null,
        memberId: data.memberId || null,
        dealId: data.dealId || null,
        companyId: data.companyId || null,
        assignedToId: data.assignedToId || userId,
        priority: data.priority ?? "MEDIUM",
        status: data.status ?? "OPEN",
        completed,
      },
      include: TASK_INCLUDE,
    });
  }

  async update(
    id: string,
    data: UpdateTaskDto,
    existing: {
      title: string;
      assignedToId: string | null;
      completed: boolean;
      status: TaskWorkflowStatus;
    },
  ) {
    const normalizeId = (
      val: string | null | undefined,
      fallback?: string | null,
    ) => {
      if (val === undefined) return undefined;
      return val && String(val).trim() ? val : (fallback ?? null);
    };

    const updateData: Record<string, unknown> = {
      ...(data.title !== undefined && {
        title: data.title?.trim() || existing.title,
      }),
      ...(data.dueDate !== undefined && {
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      }),
      ...(data.contactId !== undefined && {
        contactId: normalizeId(data.contactId),
      }),
      ...(data.memberId !== undefined && {
        memberId: normalizeId(data.memberId),
      }),
      ...(data.dealId !== undefined && { dealId: normalizeId(data.dealId) }),
      ...(data.companyId !== undefined && {
        companyId: normalizeId(data.companyId),
      }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.assignedToId !== undefined && {
        assignedToId: normalizeId(data.assignedToId, existing.assignedToId),
      }),
    };

    if (data.status !== undefined) {
      updateData.status = data.status;
      updateData.completed = data.status === "DONE";
    } else if (data.completed !== undefined) {
      updateData.completed = data.completed;
      if (data.completed) {
        updateData.status = "DONE";
      } else if (existing.status === "DONE") {
        updateData.status = "OPEN";
      }
    }

    return prisma.task.update({
      where: { id },
      data: updateData,
      include: TASK_INCLUDE,
    });
  }

  async complete(id: string) {
    return prisma.task.update({
      where: { id },
      data: { completed: true, status: "DONE" },
      include: TASK_INCLUDE,
    });
  }

  async softDelete(
    id: string,
    data: { deletedBy: string; deleteReason?: string | null },
  ) {
    return prisma.task.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: data.deletedBy,
        deleteReason: data.deleteReason ?? undefined,
      },
    });
  }

  async completeManyByContactId(contactId: string) {
    await prisma.task.updateMany({
      where: { contactId, completed: false, deletedAt: null },
      data: { completed: true, status: "DONE", contactId: null },
    });
  }

  async completeMany(tenantId: string, ids: string[]) {
    if (ids.length === 0) return { count: 0 };
    return prisma.task.updateMany({
      where: { id: { in: ids }, tenantId, deletedAt: null },
      data: { completed: true, status: "DONE" },
    });
  }

  async findIdsForTenant(tenantId: string, ids: string[]) {
    if (ids.length === 0) return [];
    const tasks = await prisma.task.findMany({
      where: { id: { in: ids }, tenantId, deletedAt: null },
      select: { id: true },
    });
    return tasks.map((t) => t.id);
  }

  async softDeleteMany(
    tenantId: string,
    ids: string[],
    data: { deletedBy: string; deleteReason?: string | null },
  ) {
    if (ids.length === 0) return { count: 0 };
    const result = await prisma.task.updateMany({
      where: { id: { in: ids }, tenantId, deletedAt: null },
      data: {
        deletedAt: new Date(),
        deletedBy: data.deletedBy,
        deleteReason: data.deleteReason ?? undefined,
      },
    });
    return result;
  }

  async createNotification(
    userId: string,
    taskId: string,
    taskTitle: string,
    dueDate: Date,
  ) {
    return prisma.notification.create({
      data: {
        userId,
        type: "TASK_DUE",
        title: "Task due",
        message: `Task "${taskTitle}" is due ${dueDate.toLocaleDateString()}`,
        resourceType: "task",
        resourceId: taskId,
      },
    });
  }
}

export default new TaskRepository();
