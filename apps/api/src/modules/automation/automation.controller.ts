import type { Request, Response } from "express";
import { ZodError } from "zod";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { ok, fail } from "@/shared/response";
import { sendControllerError } from "@/utils/controllerError";
import automationService from "./automation.service";
import {
  AutomationIdParamSchema,
  CreateAutomationDefinitionSchema,
  GetAutomationDefinitionsQuerySchema,
  GetAutomationRunsQuerySchema,
  ReplayAutomationEventSchema,
  UpdateAutomationDefinitionSchema,
} from "./automation.schema";

class AutomationController {
  getDefinitions = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const query = GetAutomationDefinitionsQuerySchema.parse(req.query);
      const result = await automationService.getDefinitions(tenantId, query);
      return ok(res, result);
    } catch (error) {
      if (error instanceof ZodError) {
        return fail(res, error.errors[0]?.message ?? "Validation error", 400);
      }
      return sendControllerError(req, res, error, "getAutomationDefinitions");
    }
  };

  getDefinitionById = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const { id } = AutomationIdParamSchema.parse(req.params);
      const automation = await automationService.getDefinitionById(
        tenantId,
        id,
      );
      return ok(res, { automation });
    } catch (error) {
      if (error instanceof ZodError) {
        return fail(res, error.errors[0]?.message ?? "Validation error", 400);
      }
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode) {
        return fail(res, (error as Error).message, statusCode);
      }
      return sendControllerError(req, res, error, "getAutomationDefinition");
    }
  };

  createDefinition = async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const body = CreateAutomationDefinitionSchema.parse(req.body);
      const automation = await automationService.createDefinition(
        tenantId,
        userId,
        body,
      );
      return ok(res, { automation }, 201);
    } catch (error) {
      if (error instanceof ZodError) {
        return fail(res, error.errors[0]?.message ?? "Validation error", 400);
      }
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode) {
        return fail(res, (error as Error).message, statusCode);
      }
      return sendControllerError(req, res, error, "createAutomationDefinition");
    }
  };

  updateDefinition = async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const { id } = AutomationIdParamSchema.parse(req.params);
      const body = UpdateAutomationDefinitionSchema.parse(req.body);
      const automation = await automationService.updateDefinition(
        tenantId,
        id,
        userId,
        body,
      );
      return ok(res, { automation });
    } catch (error) {
      if (error instanceof ZodError) {
        return fail(res, error.errors[0]?.message ?? "Validation error", 400);
      }
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode) {
        return fail(res, (error as Error).message, statusCode);
      }
      return sendControllerError(req, res, error, "updateAutomationDefinition");
    }
  };

  archiveDefinition = async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const { id } = AutomationIdParamSchema.parse(req.params);
      await automationService.archiveDefinition(tenantId, id, userId);
      return ok(res, { archived: true });
    } catch (error) {
      if (error instanceof ZodError) {
        return fail(res, error.errors[0]?.message ?? "Validation error", 400);
      }
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode) {
        return fail(res, (error as Error).message, statusCode);
      }
      return sendControllerError(
        req,
        res,
        error,
        "archiveAutomationDefinition",
      );
    }
  };

  getRuns = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const { id } = AutomationIdParamSchema.parse(req.params);
      const query = GetAutomationRunsQuerySchema.parse(req.query);
      const result = await automationService.getRuns(tenantId, id, query);
      return ok(res, result);
    } catch (error) {
      if (error instanceof ZodError) {
        return fail(res, error.errors[0]?.message ?? "Validation error", 400);
      }
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode) {
        return fail(res, (error as Error).message, statusCode);
      }
      return sendControllerError(req, res, error, "getAutomationRuns");
    }
  };

  replayEvent = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const { id } = AutomationIdParamSchema.parse(req.params);
      const body = ReplayAutomationEventSchema.parse(req.body ?? {});
      const result = await automationService.replayEvent(tenantId, id, body);
      return ok(res, result, 202);
    } catch (error) {
      if (error instanceof ZodError) {
        return fail(res, error.errors[0]?.message ?? "Validation error", 400);
      }
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode) {
        return fail(res, (error as Error).message, statusCode);
      }
      return sendControllerError(req, res, error, "replayAutomationEvent");
    }
  };
}

export default new AutomationController();
