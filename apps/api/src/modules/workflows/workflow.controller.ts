import { Request, Response } from "express";
import { ZodError } from "zod";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import {
  CreateWorkflowSchema,
  UpdateWorkflowSchema,
  GetWorkflowsQuerySchema,
  WorkflowIdParamSchema,
  WorkflowTemplateKeyParamSchema,
  InstallWorkflowTemplateSchema,
  GetWorkflowRunsQuerySchema,
} from "./workflow.schema";
import workflowService from "./workflow.service";

class WorkflowController {
  getAll = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const query = GetWorkflowsQuerySchema.parse(req.query);
      const pipelineId = query.pipelineId;
      if (pipelineId) {
        const workflows = await workflowService.getByPipeline(
          tenantId,
          pipelineId,
        );
        return res.status(200).json({ message: "OK", workflows });
      }
      const result = await workflowService.getAll(tenantId, query);
      return res.status(200).json({
        message: "OK",
        workflows: result.workflows,
        ...(result.pagination && { pagination: result.pagination }),
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return sendControllerError(req, res, error, "Get workflows error");
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const { id } = WorkflowIdParamSchema.parse(req.params);
      const workflow = await workflowService.getById(tenantId, id);
      return res.status(200).json({ message: "OK", workflow });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Invalid workflow ID" });
      }
      const appErr = error as AppError;
      if (appErr.statusCode != null) {
        return res.status(appErr.statusCode).json({ message: appErr.message });
      }
      return sendControllerError(req, res, error, "Get workflow error");
    }
  };

  getTemplates = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const templates = await workflowService.getTemplateCatalog(tenantId);
      return res.status(200).json({ message: "OK", templates });
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "Get workflow templates error",
      );
    }
  };

  installTemplate = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const { templateKey } = WorkflowTemplateKeyParamSchema.parse(req.params);
      const body = InstallWorkflowTemplateSchema.parse(req.body ?? {});
      const workflow = await workflowService.installTemplate(
        tenantId,
        templateKey,
        body,
      );
      return res.status(201).json({
        message: "Workflow template installed successfully",
        workflow,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      const appErr = error as AppError;
      if (appErr.statusCode != null) {
        return res.status(appErr.statusCode).json({ message: appErr.message });
      }
      return sendControllerError(req, res, error, "Install workflow template");
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
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
      const appErr = error as AppError;
      if (appErr.statusCode != null) {
        return res.status(appErr.statusCode).json({ message: appErr.message });
      }
      return sendControllerError(req, res, error, "Create workflow error");
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const { id } = WorkflowIdParamSchema.parse(req.params);
      const body = UpdateWorkflowSchema.parse(req.body);
      const workflow = await workflowService.update(tenantId, id, body);
      return res
        .status(200)
        .json({ message: "Workflow updated successfully", workflow });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      const appErr = error as AppError;
      if (appErr.statusCode != null) {
        return res.status(appErr.statusCode).json({ message: appErr.message });
      }
      return sendControllerError(req, res, error, "Update workflow error");
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const { id } = WorkflowIdParamSchema.parse(req.params);
      await workflowService.delete(tenantId, id);
      return res.status(200).json({ message: "Workflow deleted successfully" });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Invalid workflow ID" });
      }
      const appErr = error as AppError;
      if (appErr.statusCode != null) {
        return res.status(appErr.statusCode).json({ message: appErr.message });
      }
      return sendControllerError(req, res, error, "Delete workflow error");
    }
  };

  getRuns = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const { id } = WorkflowIdParamSchema.parse(req.params);
      const query = GetWorkflowRunsQuerySchema.parse(req.query);
      const result = await workflowService.getRuns(tenantId, id, query);
      return res.status(200).json({ message: "OK", runs: result.runs });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      const appErr = error as AppError;
      if (appErr.statusCode != null) {
        return res.status(appErr.statusCode).json({ message: appErr.message });
      }
      return sendControllerError(req, res, error, "Get workflow runs error");
    }
  };
}

export default new WorkflowController();
