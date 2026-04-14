/**
 * Pages Controller — thin HTTP layer for tenant-scoped custom pages.
 */

import { Request, Response } from "express";
import { ZodError } from "zod";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import service from "./pages.service";
import {
  CreateTenantPageSchema,
  ListTenantPagesQuerySchema,
  ReorderPagesSchema,
  UpdateTenantPageSchema,
} from "./pages.schema";

function getParam(req: Request, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : (val ?? "");
}

function handleZodError(res: Response, error: unknown): Response | null {
  if (error instanceof ZodError) {
    return res
      .status(400)
      .json({ message: error.errors[0]?.message ?? "Validation error" });
  }
  return null;
}

function handleAppError(res: Response, error: unknown): Response | null {
  const err = error as AppError;
  if (err.statusCode) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  return null;
}

class PagesController {
  listPages = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const query = ListTenantPagesQuerySchema.parse(req.query);
      const result = await service.listPages(tenantId, query);
      return res.status(200).json({ message: "OK", ...result });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "List tenant pages error")
      );
    }
  };

  getPage = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const id = getParam(req, "id");
      const page = await service.getPage(tenantId, id);
      return res.status(200).json({ message: "OK", page });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Get tenant page error")
      );
    }
  };

  createPage = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const body = CreateTenantPageSchema.parse(req.body);
      const page = await service.createPage(tenantId, body);
      return res.status(201).json({ message: "Page created", page });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Create tenant page error")
      );
    }
  };

  updatePage = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const id = getParam(req, "id");
      const body = UpdateTenantPageSchema.parse(req.body);
      const page = await service.updatePage(tenantId, id, body);
      return res.status(200).json({ message: "Page updated", page });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Update tenant page error")
      );
    }
  };

  publishPage = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const id = getParam(req, "id");
      const page = await service.publishPage(tenantId, id);
      return res.status(200).json({ message: "Page published", page });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Publish tenant page error")
      );
    }
  };

  unpublishPage = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const id = getParam(req, "id");
      const page = await service.unpublishPage(tenantId, id);
      return res.status(200).json({ message: "Page unpublished", page });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Unpublish tenant page error")
      );
    }
  };

  deletePage = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const id = getParam(req, "id");
      await service.deletePage(tenantId, id);
      return res.status(200).json({ message: "Page deleted" });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Delete tenant page error")
      );
    }
  };

  reorderPages = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const body = ReorderPagesSchema.parse(req.body);
      await service.reorder(tenantId, body);
      return res.status(200).json({ message: "Pages reordered" });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Reorder tenant pages error")
      );
    }
  };
}

export default new PagesController();
