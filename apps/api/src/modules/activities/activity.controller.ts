import { Request, Response } from "express";
import { ZodError } from "zod";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { DeleteBodySchema } from "@/shared/schemas/deleteBody.schema";
import {
  CreateActivitySchema,
  ListActivitiesByContactQuerySchema,
  ListActivitiesByDealQuerySchema,
} from "./activity.schema";
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
      const { userId, tenantId } = getAuthContext(req);
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
      const tenantId = getAuthContext(req).tenantId;
      const { contactId } = req.params;
      const parsed = ListActivitiesByContactQuerySchema.safeParse(req.query);
      const data = parsed.success ? parsed.data : undefined;
      const query =
        data && data.page != null && data.limit != null
          ? { page: data.page, limit: data.limit, type: data.type }
          : data?.type
            ? { type: data.type }
            : undefined;
      const result = await activityService.getByContact(
        tenantId,
        contactId,
        query,
      );
      return res.status(200).json({ message: "OK", ...result });
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
      const tenantId = getAuthContext(req).tenantId;
      const { dealId } = req.params;
      const parsed = ListActivitiesByDealQuerySchema.safeParse(req.query);
      const data = parsed.success ? parsed.data : undefined;
      const query =
        data && data.page != null && data.limit != null
          ? { page: data.page, limit: data.limit, type: data.type }
          : data?.type
            ? { type: data.type }
            : undefined;
      const result = await activityService.getByDeal(tenantId, dealId, query);
      return res.status(200).json({ message: "OK", ...result });
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
      const tenantId = getAuthContext(req).tenantId;
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
      const { tenantId, userId } = getAuthContext(req);
      const { id } = req.params;
      const deleteBody = DeleteBodySchema.parse(req.body ?? {});
      const ip = typeof req.ip === "string" ? req.ip : undefined;
      const userAgent = req.get("user-agent");
      await activityService.delete(tenantId, id, {
        userId,
        reason: deleteBody.reason,
        ip,
        userAgent,
      });
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
