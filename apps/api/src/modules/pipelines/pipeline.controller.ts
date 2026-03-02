import { Request, Response } from "express";
import { ZodError } from "zod";
import { CreatePipelineSchema, UpdatePipelineSchema } from "./pipeline.schema";
import pipelineService from "./pipeline.service";
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

class PipelineController {
  create = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const body = CreatePipelineSchema.parse(req.body);
      const pipeline = await pipelineService.create(tenantId, body);
      return res
        .status(201)
        .json({ message: "Pipeline created successfully", pipeline });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Create pipeline error")
      );
    }
  };

  getAll = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const pipelines = await pipelineService.getAll(tenantId);
      return res.status(200).json({ message: "OK", pipelines });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get pipelines error");
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const { id } = req.params;
      const pipeline = await pipelineService.getById(tenantId, id);
      return res.status(200).json({ message: "OK", pipeline });
    } catch (error: unknown) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Get pipeline by id error")
      );
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const { id } = req.params;
      const body = UpdatePipelineSchema.parse(req.body);
      const pipeline = await pipelineService.update(tenantId, id, body);
      return res
        .status(200)
        .json({ message: "Pipeline updated successfully", pipeline });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Update pipeline error")
      );
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const { id } = req.params;
      await pipelineService.delete(tenantId, id);
      return res.status(200).json({ message: "Pipeline deleted successfully" });
    } catch (error: unknown) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Delete pipeline error")
      );
    }
  };
}

export default new PipelineController();
