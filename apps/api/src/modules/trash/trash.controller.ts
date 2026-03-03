import { Request, Response } from "express";
import { ZodError } from "zod";
import type { AppError } from "@/middlewares/errorHandler";
import { sendControllerError } from "@/utils/controllerError";
import trashService from "./trash.service";
import {
  ListTrashQuerySchema,
  RestoreItemParamsSchema,
  PermanentlyDeleteParamsSchema,
} from "./trash.schema";

class TrashController {
  listTrash = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const parsed = ListTrashQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        const msg = parsed.error.errors[0]?.message ?? "Validation error";
        return res.status(400).json({ message: msg });
      }
      const result = await trashService.list(tenantId, parsed.data);
      return res.status(200).json(result);
    } catch (error: unknown) {
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "List trash error");
    }
  };

  restoreItem = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const parsed = RestoreItemParamsSchema.safeParse(req.params);
      if (!parsed.success) {
        const msg = parsed.error.errors[0]?.message ?? "Validation error";
        return res.status(400).json({ message: msg });
      }
      const { entityType, id } = parsed.data;
      const { type } = await trashService.restore(tenantId, entityType, id);
      return res.status(200).json({
        message: `${type} restored successfully`,
      });
    } catch (error: unknown) {
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      if (error instanceof ZodError) {
        const msg = error.errors[0]?.message ?? "Validation error";
        return res.status(400).json({ message: msg });
      }
      return sendControllerError(req, res, error, "Restore item error");
    }
  };

  permanentlyDeleteItem = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const parsed = PermanentlyDeleteParamsSchema.safeParse(req.params);
      if (!parsed.success) {
        const msg = parsed.error.errors[0]?.message ?? "Validation error";
        return res.status(400).json({ message: msg });
      }
      const { entityType, id } = parsed.data;
      const { type } = await trashService.permanentlyDelete(
        tenantId,
        entityType,
        id,
      );
      return res.status(200).json({
        message: `${type} permanently deleted`,
      });
    } catch (error: unknown) {
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      if (error instanceof ZodError) {
        const msg = error.errors[0]?.message ?? "Validation error";
        return res.status(400).json({ message: msg });
      }
      return sendControllerError(
        req,
        res,
        error,
        "Permanently delete item error",
      );
    }
  };
}

export default new TrashController();
