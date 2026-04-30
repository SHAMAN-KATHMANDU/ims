/**
 * site-layouts controller — thin HTTP layer.
 */

import { Request, Response } from "express";
import { ZodError } from "zod";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import service from "./site-layouts.service";
import {
  ListSiteLayoutsQuerySchema,
  SiteLayoutScopeEnum,
  UpsertSiteLayoutSchema,
} from "./site-layouts.schema";

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

function parseScopeParam(req: Request): {
  scope: string;
  pageId: string | null;
} {
  const scope = SiteLayoutScopeEnum.parse(req.params.scope);
  const rawPageId = req.query.pageId;
  const pageId =
    typeof rawPageId === "string" && rawPageId.length > 0 ? rawPageId : null;
  return { scope, pageId };
}

class SiteLayoutsController {
  list = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const query = ListSiteLayoutsQuerySchema.parse(req.query);
      const layouts = await service.list(tenantId, query);
      return res.status(200).json({ message: "OK", layouts });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "List site layouts error")
      );
    }
  };

  get = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const key = parseScopeParam(req);
      const layout = await service.get(tenantId, key);
      return res.status(200).json({ message: "OK", layout });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Get site layout error")
      );
    }
  };

  upsert = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const body = UpsertSiteLayoutSchema.parse(req.body);
      const layout = await service.upsertDraft(tenantId, body);
      return res.status(200).json({ message: "Draft saved", layout });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Upsert site layout error")
      );
    }
  };

  publish = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const key = parseScopeParam(req);
      const layout = await service.publishDraft(tenantId, key);
      return res.status(200).json({ message: "Layout published", layout });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Publish site layout error")
      );
    }
  };

  getPreviewUrl = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const key = parseScopeParam(req);
      const result = await service.mintPreviewUrl(tenantId, key);
      return res.status(200).json({ message: "OK", ...result });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(
          req,
          res,
          error,
          "Mint site layout preview URL error",
        )
      );
    }
  };

  /**
   * POST /site-layouts/preview/refresh
   * Refresh an existing preview token, issuing a new one with a fresh 30-min TTL.
   */
  refreshPreviewToken = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const { token } = req.body as { token?: unknown };
      if (typeof token !== "string" || token.length === 0) {
        return res.status(400).json({ message: "token is required" });
      }
      const result = await service.refreshPreviewToken(tenantId, token);
      return res.status(200).json({ message: "Token refreshed", ...result });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Refresh preview token error")
      );
    }
  };

  /**
   * POST /site-layouts/preview/invalidate
   * Revoke a preview token's Redis nonce, immediately blocking further use.
   */
  invalidatePreviewToken = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const { token } = req.body as { token?: unknown };
      if (typeof token !== "string" || token.length === 0) {
        return res.status(400).json({ message: "token is required" });
      }
      await service.invalidatePreviewToken(tenantId, token);
      return res.status(200).json({ message: "Token invalidated" });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Invalidate preview token error")
      );
    }
  };

  resetFromTemplate = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const key = parseScopeParam(req);
      const layout = await service.resetScopeFromTemplate(tenantId, key);
      return res.status(200).json({ message: "Reset from template", layout });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(
          req,
          res,
          error,
          "Reset site layout from template error",
        )
      );
    }
  };

  remove = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const key = parseScopeParam(req);
      await service.deleteLayout(tenantId, key);
      return res.status(200).json({ message: "Layout deleted" });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Delete site layout error")
      );
    }
  };
}

export default new SiteLayoutsController();
