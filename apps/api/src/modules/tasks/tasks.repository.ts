/**
 * Tasks repository - database access for tasks module.
 */

import prisma from "@/config/prisma";
import type { Prisma } from "@prisma/client";

const taskInclude = {
  contact: { select: { id: true, firstName: true, lastName: true } },
  member: { select: { id: true, name: true, phone: true } },
  deal: { select: { id: true, name: true } },
  assignedTo: { select: { id: true, username: true } },
} as const;

const taskIncludeFull = {
  contact: true,
  member: true,
  deal: true,
  assignedTo: { select: { id: true, username: true } },
} as const;

export const tasksRepository = {
  findTasks(params: {
    where: Prisma.TaskWhereInput;
    orderBy: Prisma.TaskOrderByWithRelationInput;
    skip: number;
    take: number;
  }) {
    return prisma.task.findMany({
      where: params.where,
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
      include: taskInclude,
    });
  },

  countTasks(where: Prisma.TaskWhereInput) {
    return prisma.task.count({ where });
  },

  findTaskById(id: string, tenantId: string) {
    return prisma.task.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: taskIncludeFull,
    });
  },

  findTaskByIdForUpdate(id: string, tenantId: string) {
    return prisma.task.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  },

  createTask(data: Prisma.TaskCreateInput) {
    return prisma.task.create({
      data,
      include: taskInclude,
    });
  },

  updateTask(id: string, data: Prisma.TaskUpdateInput) {
    return prisma.task.update({
      where: { id },
      data,
      include: taskInclude,
    });
  },

  softDeleteTask(id: string) {
    return prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};
