/**
 * Platform Domains Controller — thin HTTP layer.
 */

import { Request, Response } from "express";
import { ZodError } from "zod";
import { sendControllerError } from "@/utils/controllerError";
import service from "./platform-domains.service";
import {
  CreateTenantDomainSchema,
  UpdateTenantDomainSchema,
  ListTenantDomainsQuerySchema,
} from "./platform-domains.schema";

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

class PlatformDomainsController {
  listTenantDomains = async (req: Request, res: Response) => {
    try {
      const tenantId = getParam(req, "tenantId");
      const parsed = ListTenantDomainsQuerySchema.safeParse(req.query);
      const appType = parsed.success ? parsed.data.appType : undefined;
      const domains = await service.listTenantDomains(tenantId, appType);
      return res.status(200).json({ message: "OK", domains });
    } catch (error) {
      return handleError(req, res, error, "List tenant domains error");
    }
  };

  createTenantDomain = async (req: Request, res: Response) => {
    try {
      const tenantId = getParam(req, "tenantId");
      const body = CreateTenantDomainSchema.parse(req.body);
      const domain = await service.addDomain(tenantId, body);
      return res.status(201).json({ message: "Domain added", domain });
    } catch (error) {
      return handleError(req, res, error, "Create tenant domain error");
    }
  };

  updateDomain = async (req: Request, res: Response) => {
    try {
      const id = getParam(req, "id");
      const body = UpdateTenantDomainSchema.parse(req.body);
      const domain = await service.updateDomain(id, body);
      return res.status(200).json({ message: "Domain updated", domain });
    } catch (error) {
      return handleError(req, res, error, "Update domain error");
    }
  };

  deleteDomain = async (req: Request, res: Response) => {
    try {
      const id = getParam(req, "id");
      await service.deleteDomain(id);
      return res.status(200).json({ message: "Domain deleted" });
    } catch (error) {
      return handleError(req, res, error, "Delete domain error");
    }
  };

  getVerificationInstructions = async (req: Request, res: Response) => {
    try {
      const id = getParam(req, "id");
      const instructions = await service.getVerificationInstructions(id);
      return res.status(200).json({ message: "OK", ...instructions });
    } catch (error) {
      return handleError(req, res, error, "Get verification error");
    }
  };

  verifyDomain = async (req: Request, res: Response) => {
    try {
      const id = getParam(req, "id");
      const domain = await service.verifyDomain(id);
      return res.status(200).json({ message: "Domain verified", domain });
    } catch (error) {
      return handleError(req, res, error, "Verify domain error");
    }
  };
}

export default new PlatformDomainsController();
