import { Request, Response } from "express";
import { ZodError } from "zod";
import { CRM_PIPELINE_TEMPLATES } from "@repo/shared";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { DeleteBodySchema } from "@/shared/schemas/deleteBody.schema";
import {
  CreatePipelineSchema,
  ListPipelinesQuerySchema,
  UpdatePipelineSchema,
} from "./pipeline.schema";
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
      const tenantId = getAuthContext(req).tenantId;
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
      const tenantId = getAuthContext(req).tenantId;
      const query = ListPipelinesQuerySchema.safeParse(req.query);
      const parsed = query.success ? query.data : undefined;
      const result = await pipelineService.getAll(tenantId, parsed);
      return res.status(200).json({
        message: "OK",
        pipelines: result.pipelines,
        ...(result.pagination && { pagination: result.pagination }),
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get pipelines error");
    }
  };

  listTemplates = async (req: Request, res: Response) => {
    try {
      const templates = CRM_PIPELINE_TEMPLATES.map(
        ({
          templateId,
          name,
          description,
          type,
          stageNames,
          probabilities,
          suggestAsDefault,
          closedWonStageName,
          closedLostStageName,
        }) => ({
          templateId,
          name,
          description,
          type,
          stageNames,
          probabilities: [...probabilities],
          suggestAsDefault,
          closedWonStageName,
          closedLostStageName,
        }),
      );
      return res.status(200).json({ message: "OK", templates });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "List pipeline templates");
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
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
      const tenantId = getAuthContext(req).tenantId;
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

  seedFramework = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const result = await pipelineService.seedFramework(tenantId);
      return res.status(201).json({
        message: "Pipeline framework seeded successfully",
        ...result,
      });
    } catch (error: unknown) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Seed pipeline framework error")
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
      await pipelineService.delete(tenantId, id, {
        userId,
        reason: deleteBody.reason,
        ip,
        userAgent,
      });
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
