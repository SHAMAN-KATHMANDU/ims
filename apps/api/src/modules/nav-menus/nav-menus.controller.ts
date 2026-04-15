/**
 * nav-menus controller — thin HTTP layer.
 */

import { Request, Response } from "express";
import { ZodError } from "zod";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import service from "./nav-menus.service";
import { NavSlotEnum, UpsertNavMenuSchema } from "./nav-menus.schema";

function handleZodError(res: Response, error: unknown): Response | null {
  if (error instanceof ZodError) {
    return res
      .status(400)
      .json({ message: error.errors[0]?.message ?? "Validation error" });
  }
  return null;
}

function handleAppError(res: Response, error: unknown): Response | null {
  const err = error as AppError;
  if (err.statusCode) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  return null;
}

class NavMenusController {
  list = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const menus = await service.list(tenantId);
      return res.status(200).json({ message: "OK", menus });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "List nav menus error")
      );
    }
  };

  getBySlot = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const slot = NavSlotEnum.parse(req.params.slot);
      const menu = await service.getBySlot(tenantId, slot);
      if (!menu) return res.status(404).json({ message: "Nav menu not found" });
      return res.status(200).json({ message: "OK", menu });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Get nav menu error")
      );
    }
  };

  upsert = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const body = UpsertNavMenuSchema.parse(req.body);
      const menu = await service.upsert(tenantId, body);
      return res.status(200).json({ message: "Nav menu saved", menu });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Upsert nav menu error")
      );
    }
  };

  remove = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const slot = NavSlotEnum.parse(req.params.slot);
      await service.deleteBySlot(tenantId, slot);
      return res.status(200).json({ message: "Nav menu deleted" });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Delete nav menu error")
      );
    }
  };
}

export default new NavMenusController();
