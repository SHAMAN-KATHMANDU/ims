/**
 * Platform-websites Controller — thin HTTP layer.
 */

import { Request, Response } from "express";
import { ZodError } from "zod";
import { sendControllerError } from "@/utils/controllerError";
import service from "./platform-websites.service";
import { EnableWebsiteSchema } from "./platform-websites.schema";

function getParam(req: Request, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : (val ?? "");
}

function handleError(
  req: Request,
  res: Response,
  error: unknown,
  context: string,
) {
  if (error instanceof ZodError) {
    return res
      .status(400)
      .json({ message: error.errors[0]?.message ?? "Validation error" });
  }
  const err = error as { statusCode?: number; message?: string };
  if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
    return res
      .status(err.statusCode)
      .json({ message: err.message ?? "Request failed" });
  }
  return sendControllerError(req, res, error, context);
}

class PlatformWebsitesController {
  listTemplates = async (req: Request, res: Response) => {
    try {
      const templates = await service.listTemplates();
      return res.status(200).json({ message: "OK", templates });
    } catch (error) {
      return handleError(req, res, error, "List site templates error");
    }
  };

  getSiteConfig = async (req: Request, res: Response) => {
    try {
      const tenantId = getParam(req, "tenantId");
      const siteConfig = await service.getSiteConfig(tenantId);
      return res.status(200).json({ message: "OK", siteConfig });
    } catch (error) {
      return handleError(req, res, error, "Get site config error");
    }
  };

  enableWebsite = async (req: Request, res: Response) => {
    try {
      const tenantId = getParam(req, "tenantId");
      const body = EnableWebsiteSchema.parse(req.body ?? {});
      const siteConfig = await service.enableWebsite(tenantId, body);
      return res.status(200).json({ message: "Website enabled", siteConfig });
    } catch (error) {
      return handleError(req, res, error, "Enable website error");
    }
  };

  disableWebsite = async (req: Request, res: Response) => {
    try {
      const tenantId = getParam(req, "tenantId");
      const siteConfig = await service.disableWebsite(tenantId);
      return res.status(200).json({ message: "Website disabled", siteConfig });
    } catch (error) {
      return handleError(req, res, error, "Disable website error");
    }
  };
}

export default new PlatformWebsitesController();
