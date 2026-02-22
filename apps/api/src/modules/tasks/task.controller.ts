import { Request, Response } from "express";
import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import { sendControllerError } from "@/utils/controllerError";

function getUserId(req: Request): string | null {
  return (req as any).user?.id ?? null;
}

function getTenantId(req: Request): string | null {
  return req.tenant?.id ?? (req as any).user?.tenantId ?? null;
}

class TaskController {
  async create(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const tenantId = getTenantId(req);
      if (!userId)
        return res.status(401).json({ message: "Not authenticated" });
      if (!tenantId)
        return res.status(401).json({ message: "Tenant context is required" });

      const { title, dueDate, contactId, memberId, dealId, assignedToId } =
        req.body;

      const task = await prisma.task.create({
        data: {
          tenantId,
          title,
          dueDate: dueDate ? new Date(dueDate) : null,
          contactId: contactId || null,
          memberId: memberId || null,
          dealId: dealId || null,
          assignedToId: assignedToId || userId,
        },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
          member: { select: { id: true, name: true, phone: true } },
          deal: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, username: true } },
        },
      });

      if (task.dueDate && task.assignedToId) {
        await prisma.notification.create({
          data: {
            userId: task.assignedToId,
            type: "TASK_DUE",
            title: "Task due",
            message: `Task "${task.title}" is due ${task.dueDate.toLocaleDateString()}`,
            resourceType: "task",
            resourceId: task.id,
          },
        });
      }

      res.status(201).json({ message: "Task created successfully", task });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Create task error");
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId)
        return res.status(401).json({ message: "Not authenticated" });

      const { page, limit, sortBy, sortOrder, search } = getPaginationParams(
        req.query,
      );
      const { completed, assignedToId, dueToday } = req.query as {
        completed?: boolean;
        assignedToId?: string;
        dueToday?: boolean;
      };

      const allowedSortFields = [
        "createdAt",
        "updatedAt",
        "dueDate",
        "title",
        "id",
      ];
      const orderBy = getPrismaOrderBy(
        sortBy,
        sortOrder,
        allowedSortFields,
      ) || {
        dueDate: "asc",
      };

      const where: Record<string, unknown> = {};
      if (search) {
        where.title = { contains: search, mode: "insensitive" as const };
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
        prisma.task.count({ where }),
        prisma.task.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            contact: { select: { id: true, firstName: true, lastName: true } },
            member: { select: { id: true, name: true, phone: true } },
            deal: { select: { id: true, name: true } },
            assignedTo: { select: { id: true, username: true } },
          },
        }),
      ]);

      const result = createPaginationResult(tasks, totalItems, page, limit);
      res.status(200).json({ message: "OK", ...result });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get tasks error");
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const task = await prisma.task.findUnique({
        where: { id },
        include: {
          contact: true,
          member: true,
          deal: true,
          assignedTo: { select: { id: true, username: true } },
        },
      });

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.status(200).json({ message: "OK", task });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get task by id error");
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        title,
        dueDate,
        completed,
        contactId,
        memberId,
        dealId,
        assignedToId,
      } = req.body;

      const existing = await prisma.task.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ message: "Task not found" });
      }

      const updateData: Record<string, unknown> = {
        ...(title !== undefined && { title: title || existing.title }),
        ...(dueDate !== undefined && {
          dueDate: dueDate ? new Date(dueDate) : null,
        }),
        ...(completed !== undefined && { completed: !!completed }),
        ...(contactId !== undefined && { contactId: contactId || null }),
        ...(memberId !== undefined && { memberId: memberId || null }),
        ...(dealId !== undefined && { dealId: dealId || null }),
        ...(assignedToId !== undefined && { assignedToId }),
      };

      const task = await prisma.task.update({
        where: { id },
        data: updateData,
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
          member: { select: { id: true, name: true, phone: true } },
          deal: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, username: true } },
        },
      });

      res.status(200).json({ message: "Task updated successfully", task });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Update task error");
    }
  }

  async complete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const task = await prisma.task.update({
        where: { id },
        data: { completed: true },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
          member: { select: { id: true, name: true, phone: true } },
          deal: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, username: true } },
        },
      });

      res.status(200).json({ message: "Task completed", task });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Complete task error");
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const existing = await prisma.task.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ message: "Task not found" });
      }

      await prisma.task.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      res.status(200).json({ message: "Task deleted successfully" });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Delete task error");
    }
  }
}

export default new TaskController();
