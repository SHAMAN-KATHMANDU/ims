/**
 * Sites Controller — thin HTTP layer for tenant-scoped site management.
 */

import { Request, Response } from "express";
import { ZodError } from "zod";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import service from "./sites.service";
import { UpdateSiteConfigSchema, PickTemplateSchema } from "./sites.schema";

function handleAppError(res: Response, error: unknown): Response | null {
  const err = error as AppError;
  if (err.statusCode) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  return null;
}

function handleZodError(res: Response, error: unknown): Response | null {
  if (error instanceof ZodError) {
    return res
      .status(400)
      .json({ message: error.errors[0]?.message ?? "Validation error" });
  }
  return null;
}

class SitesController {
  getConfig = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const siteConfig = await service.getConfig(tenantId);
      return res.status(200).json({ message: "OK", siteConfig });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Get site config error")
      );
    }
  };

  updateConfig = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const body = UpdateSiteConfigSchema.parse(req.body);
      const siteConfig = await service.updateConfig(tenantId, body);
      return res
        .status(200)
        .json({ message: "Site config updated", siteConfig });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Update site config error")
      );
    }
  };

  listTemplates = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const templates = await service.listTemplates(tenantId);
      return res.status(200).json({ message: "OK", templates });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "List site templates error")
      );
    }
  };

  pickTemplate = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const body = PickTemplateSchema.parse(req.body);
      const siteConfig = await service.pickTemplate(tenantId, body);
      return res.status(200).json({ message: "Template applied", siteConfig });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Pick site template error")
      );
    }
  };

  publish = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const siteConfig = await service.publish(tenantId);
      return res.status(200).json({ message: "Site published", siteConfig });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Publish site error")
      );
    }
  };

  unpublish = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const siteConfig = await service.unpublish(tenantId);
      return res.status(200).json({ message: "Site unpublished", siteConfig });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Unpublish site error")
      );
    }
  };
}

export default new SitesController();
