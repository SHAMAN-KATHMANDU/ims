import { Request, Response } from "express";
import { getValidatedQuery } from "@/middlewares/validateRequest";
import { ok, okPaginated, fail } from "@/shared/response";
import { tasksService } from "./tasks.service";

class TaskController {
  async create(req: Request, res: Response) {
    const auth = req.authContext!;

    const { title, dueDate, contactId, memberId, dealId, assignedToId } =
      req.body;

    const task = await tasksService.create(auth.tenantId, auth.userId, {
      title,
      dueDate,
      contactId,
      memberId,
      dealId,
      assignedToId,
    });
    return ok(res, { task }, 201, "Task created successfully");
  }

  async getAll(req: Request, res: Response) {
    const auth = req.authContext!;

    const query = getValidatedQuery<{
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
      completed?: boolean;
      assignedToId?: string;
      dueToday?: boolean;
    }>(req, res);

    const result = await tasksService.getAll(auth.tenantId, query);
    return okPaginated(res, result.data, result.pagination);
  }

  async getById(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params as { id: string };
    const task = await tasksService.getById(id, auth.tenantId);
    return ok(res, { task });
  }

  async update(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params as { id: string };
    const {
      title,
      dueDate,
      completed,
      contactId,
      memberId,
      dealId,
      assignedToId,
    } = req.body;

    const task = await tasksService.update(id, auth.tenantId, {
      title,
      dueDate,
      completed,
      contactId,
      memberId,
      dealId,
      assignedToId,
    });
    return ok(res, { task }, 200, "Task updated successfully");
  }

  async complete(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params as { id: string };
    const task = await tasksService.complete(id, auth.tenantId);
    return ok(res, { task }, 200, "Task completed");
  }

  async delete(req: Request, res: Response) {
    const auth = req.authContext!;

    const { id } = req.params as { id: string };
    await tasksService.delete(id, auth.tenantId);
    return ok(res, undefined, 200, "Task deleted successfully");
  }
}

export default new TaskController();
