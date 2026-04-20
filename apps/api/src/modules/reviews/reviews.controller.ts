/**
 * Reviews controller — tenant-admin HTTP layer for review moderation.
 * Gate: admin/superAdmin (enforced on the router).
 */

import { Request, Response } from "express";
import { ZodError } from "zod";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import service from "./reviews.service";
import { ListReviewsQuerySchema, UpdateReviewSchema } from "./reviews.schema";

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

class ReviewsController {
  list = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const query = ListReviewsQuerySchema.parse(req.query);
      const result = await service.list(tenantId, query);
      return res.status(200).json({ message: "OK", ...result });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "List reviews error")
      );
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const id = req.params.id ?? "";
      const body = UpdateReviewSchema.parse(req.body);
      const review = await service.update(tenantId, id, body);
      return res.status(200).json({ message: "Review updated", review });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Update review error")
      );
    }
  };

  remove = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const id = req.params.id ?? "";
      await service.remove(tenantId, id);
      return res.status(200).json({ message: "Review deleted" });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Delete review error")
      );
    }
  };
}

export default new ReviewsController();
