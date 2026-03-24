import { Request, Response } from "express";
import { ZodError } from "zod";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import { DeleteBodySchema } from "@/shared/schemas/deleteBody.schema";
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  BulkIdsSchema,
} from "./task.schema";
import taskService from "./task.service";

class TaskController {
  create = async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const body = CreateTaskSchema.parse(req.body);
      const task = await taskService.create(tenantId, body, userId);
      return res
        .status(201)
        .json({ message: "Task created successfully", task });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Create task error");
    }
  };

  getAll = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const result = await taskService.getAll(
        tenantId,
        req.query as Record<string, unknown>,
      );
      return res.status(200).json({ message: "OK", ...result });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get tasks error");
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const task = await taskService.getById(tenantId, req.params.id);
      return res.status(200).json({ message: "OK", task });
    } catch (error: unknown) {
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Get task by id error");
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const body = UpdateTaskSchema.parse(req.body);
      const task = await taskService.update(tenantId, req.params.id, body);
      return res
        .status(200)
        .json({ message: "Task updated successfully", task });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Update task error");
    }
  };

  complete = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const task = await taskService.complete(tenantId, req.params.id);
      return res.status(200).json({ message: "Task completed", task });
    } catch (error: unknown) {
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Complete task error");
    }
  };

  bulkComplete = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const body = BulkIdsSchema.parse(req.body);
      const result = await taskService.bulkComplete(tenantId, body.ids);
      return res
        .status(200)
        .json({ message: "Tasks completed", count: result.count });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Bulk complete tasks error");
    }
  };

  bulkDelete = async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const body = BulkIdsSchema.parse(req.body);
      const ip = typeof req.ip === "string" ? req.ip : undefined;
      const userAgent = req.get("user-agent");
      const result = await taskService.bulkDelete(tenantId, body.ids, {
        userId,
        reason: body.reason,
        ip,
        userAgent,
      });
      return res
        .status(200)
        .json({ message: "Tasks deleted", count: result.count });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Bulk delete tasks error");
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const deleteBody = DeleteBodySchema.parse(req.body ?? {});
      const ip = typeof req.ip === "string" ? req.ip : undefined;
      const userAgent = req.get("user-agent");
      await taskService.delete(tenantId, id, {
        userId,
        reason: deleteBody.reason,
        ip,
        userAgent,
      });
      return res.status(200).json({ message: "Task deleted successfully" });
    } catch (error: unknown) {
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Delete task error");
    }
  };
}

export default new TaskController();
