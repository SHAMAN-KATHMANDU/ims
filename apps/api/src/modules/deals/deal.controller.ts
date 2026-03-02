import { Request, Response } from "express";
import { ZodError } from "zod";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import {
  CreateDealSchema,
  UpdateDealSchema,
  UpdateDealStageSchema,
} from "./deal.schema";
import dealService from "./deal.service";

class DealController {
  create = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const body = CreateDealSchema.parse(req.body);
      const deal = await dealService.create(tenantId, body, userId);
      return res
        .status(201)
        .json({ message: "Deal created successfully", deal });
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
      return sendControllerError(req, res, error, "Create deal error");
    }
  };

  getAll = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const result = await dealService.getAll(
        tenantId,
        req.query as Record<string, unknown>,
      );
      return res.status(200).json({ message: "OK", ...result });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get deals error");
    }
  };

  getByPipeline = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const pipelineId = req.query.pipelineId as string | undefined;
      const result = await dealService.getByPipeline(tenantId, pipelineId);
      return res.status(200).json({ message: "OK", ...result });
    } catch (error: unknown) {
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(
        req,
        res,
        error,
        "Get deals by pipeline error",
      );
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const deal = await dealService.getById(tenantId, req.params.id);
      return res.status(200).json({ message: "OK", deal });
    } catch (error: unknown) {
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Get deal by id error");
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const body = UpdateDealSchema.parse(req.body);
      const deal = await dealService.update(tenantId, req.params.id, body);
      return res
        .status(200)
        .json({ message: "Deal updated successfully", deal });
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
      return sendControllerError(req, res, error, "Update deal error");
    }
  };

  updateStage = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const body = UpdateDealStageSchema.parse(req.body);
      const deal = await dealService.updateStage(tenantId, req.params.id, body);
      return res.status(200).json({ message: "Deal stage updated", deal });
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
      return sendControllerError(req, res, error, "Update deal stage error");
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      await dealService.delete(tenantId, req.params.id);
      return res.status(200).json({ message: "Deal deleted successfully" });
    } catch (error: unknown) {
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Delete deal error");
    }
  };
}

export default new DealController();
