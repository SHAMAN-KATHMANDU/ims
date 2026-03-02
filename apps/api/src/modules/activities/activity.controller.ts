import { Request, Response } from "express";
import { ZodError } from "zod";
import { CreateActivitySchema } from "./activity.schema";
import activityService from "./activity.service";
import { sendControllerError } from "@/utils/controllerError";
import type { AppError } from "@/middlewares/errorHandler";

const handleAppError = (res: Response, error: unknown): Response | null => {
  if ((error as AppError).statusCode) {
    return res
      .status((error as AppError).statusCode!)
      .json({ message: (error as AppError).message });
  }
  return null;
};

class ActivityController {
  create = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const tenantId = req.user!.tenantId;
      const body = CreateActivitySchema.parse(req.body);
      const activity = await activityService.create(tenantId, userId, body);
      return res.status(201).json({ message: "Activity logged", activity });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Create activity error")
      );
    }
  };

  getByContact = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const { contactId } = req.params;
      const activities = await activityService.getByContact(
        tenantId,
        contactId,
      );
      return res.status(200).json({ message: "OK", activities });
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "Get activities by contact error",
      );
    }
  };

  getByDeal = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const { dealId } = req.params;
      const activities = await activityService.getByDeal(tenantId, dealId);
      return res.status(200).json({ message: "OK", activities });
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "Get activities by deal error",
      );
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const { id } = req.params;
      const activity = await activityService.getById(tenantId, id);
      return res.status(200).json({ message: "OK", activity });
    } catch (error: unknown) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Get activity by id error")
      );
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const { id } = req.params;
      await activityService.delete(tenantId, id);
      return res.status(200).json({ message: "Activity deleted" });
    } catch (error: unknown) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Delete activity error")
      );
    }
  };
}

export default new ActivityController();
