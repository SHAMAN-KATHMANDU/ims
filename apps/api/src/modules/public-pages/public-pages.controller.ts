/**
 * Public Pages Controller — thin HTTP layer for unauthenticated page reads.
 * Tenant comes from `resolveTenantFromHostname` (req.tenant), not JWT.
 */

import { Request, Response } from "express";
import { ZodError } from "zod";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import service from "./public-pages.service";
import { ListPublicPagesQuerySchema } from "./public-pages.schema";

function getTenantId(req: Request): string {
  const tenantId = req.tenant?.id;
  if (!tenantId) {
    const err = new Error("Host not resolved") as AppError;
    err.statusCode = 400;
    throw err;
  }
  return tenantId;
}

function getParam(req: Request, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : (val ?? "");
}

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

class PublicPagesController {
  listPages = async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const query = ListPublicPagesQuerySchema.parse(req.query);
      const pages = await service.listPages(tenantId, query);
      return res.status(200).json({ message: "OK", pages });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "List public pages error")
      );
    }
  };

  getPageBySlug = async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const slug = getParam(req, "slug");
      const page = await service.getPageBySlug(tenantId, slug);
      return res.status(200).json({ message: "OK", page });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Get public page error")
      );
    }
  };
}

export default new PublicPagesController();
