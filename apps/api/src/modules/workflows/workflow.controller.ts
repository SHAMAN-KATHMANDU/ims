import { Request, Response } from "express";
import { ZodError } from "zod";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import { CreateWorkflowSchema, UpdateWorkflowSchema } from "./workflow.schema";
import workflowService from "./workflow.service";

const handleAppError = (res: Response, error: unknown): Response | null => {
  if ((error as AppError).statusCode) {
    return res
      .status((error as AppError).statusCode!)
      .json({ message: (error as AppError).message });
  }
  return null;
};

class WorkflowController {
  getAll = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const pipelineId = req.query.pipelineId as string | undefined;
      const workflows = pipelineId
        ? await workflowService.getByPipeline(tenantId, pipelineId)
        : await workflowService.getAll(tenantId);
      return res.status(200).json({ message: "OK", workflows });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get workflows error");
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const workflow = await workflowService.getById(tenantId, req.params.id);
      return res.status(200).json({ message: "OK", workflow });
    } catch (error: unknown) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Get workflow error")
      );
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const body = CreateWorkflowSchema.parse(req.body);
      const workflow = await workflowService.create(tenantId, body);
      return res
        .status(201)
        .json({ message: "Workflow created successfully", workflow });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Create workflow error")
      );
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const body = UpdateWorkflowSchema.parse(req.body);
      const workflow = await workflowService.update(
        tenantId,
        req.params.id,
        body,
      );
      return res
        .status(200)
        .json({ message: "Workflow updated successfully", workflow });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Update workflow error")
      );
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      await workflowService.delete(tenantId, req.params.id);
      return res.status(200).json({ message: "Workflow deleted successfully" });
    } catch (error: unknown) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Delete workflow error")
      );
    }
  };
}

export default new WorkflowController();
