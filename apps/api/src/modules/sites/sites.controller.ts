/**
 * Sites Controller — thin HTTP layer for tenant-scoped site management.
 */

import { Request, Response } from "express";
import { ZodError } from "zod";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import { ok, fail } from "@/shared/response";
import service from "./sites.service";
import {
  UpdateSiteConfigSchema,
  PickTemplateSchema,
  CreatePageSchema,
  UpdatePageSchema,
  UpsertBlocksSchema,
  AddBlockSchema,
  UpdateBlockSchema,
  ReorderBlocksSchema,
  UpdateGlobalsSchema,
  UpdateThemeSchema,
  UpdateSeoSchema,
  AnalyticsSchema,
} from "./sites.schema";

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

  // ——— PAGES ———

  listPages = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const pages = await service.listPages(tenantId);
      return ok(res, { pages }, 200);
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "List pages error")
      );
    }
  };

  getPage = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const { pageId } = req.params;
      const page = await service.getPage(tenantId, pageId);
      return ok(res, { page }, 200);
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Get page error")
      );
    }
  };

  createPage = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const body = CreatePageSchema.parse(req.body);
      const page = await service.createPage(tenantId, body);
      return ok(res, { page }, 201);
    } catch (error) {
      if (error instanceof ZodError) {
        return fail(res, error.errors[0]?.message ?? "Validation error", 400);
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Create page error")
      );
    }
  };

  updatePage = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const { pageId } = req.params;
      const body = UpdatePageSchema.parse(req.body);
      const page = await service.updatePage(tenantId, pageId, body);
      return ok(res, { page }, 200);
    } catch (error) {
      if (error instanceof ZodError) {
        return fail(res, error.errors[0]?.message ?? "Validation error", 400);
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Update page error")
      );
    }
  };

  deletePage = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const { pageId } = req.params;
      await service.deletePage(tenantId, pageId);
      return ok(res, { message: "Page deleted" }, 200);
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Delete page error")
      );
    }
  };

  // ——— BLOCKS ———

  upsertBlocks = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const body = UpsertBlocksSchema.parse(req.body);
      const result = await service.upsertBlocks(tenantId, body);
      return ok(res, { blocks: result }, 200);
    } catch (error) {
      if (error instanceof ZodError) {
        return fail(res, error.errors[0]?.message ?? "Validation error", 400);
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Upsert blocks error")
      );
    }
  };

  addBlock = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const { scope } = req.params;
      const { pageId } = req.query;
      const body = AddBlockSchema.parse(req.body);
      const blocks = await service.addBlock(tenantId, {
        pageId: (pageId as string | undefined) || null,
        scope,
        block: body.block,
      });
      return ok(res, { blocks }, 201);
    } catch (error) {
      if (error instanceof ZodError) {
        return fail(res, error.errors[0]?.message ?? "Validation error", 400);
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Add block error")
      );
    }
  };

  updateBlock = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const { scope, blockId } = req.params;
      const { pageId } = req.query;
      const body = UpdateBlockSchema.parse(req.body);
      const blocks = await service.updateBlock(tenantId, {
        pageId: (pageId as string | undefined) || null,
        scope,
        blockId,
        ...body,
      });
      return ok(res, { blocks }, 200);
    } catch (error) {
      if (error instanceof ZodError) {
        return fail(res, error.errors[0]?.message ?? "Validation error", 400);
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Update block error")
      );
    }
  };

  deleteBlock = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const { scope, blockId } = req.params;
      const { pageId } = req.query;
      const blocks = await service.deleteBlock(tenantId, {
        pageId: (pageId as string | undefined) || null,
        scope,
        blockId,
      });
      return ok(res, { blocks }, 200);
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Delete block error")
      );
    }
  };

  reorderBlocks = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const { scope } = req.params;
      const { pageId } = req.query;
      const body = ReorderBlocksSchema.parse(req.body);
      const blocks = await service.reorderBlocks(tenantId, {
        pageId: (pageId as string | undefined) || null,
        scope,
        blockIds: body.blockIds,
      });
      return ok(res, { blocks }, 200);
    } catch (error) {
      if (error instanceof ZodError) {
        return fail(res, error.errors[0]?.message ?? "Validation error", 400);
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Reorder blocks error")
      );
    }
  };

  // ——— GLOBALS (Header/Footer) ———

  getGlobals = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const globals = await service.getGlobals(tenantId);
      return ok(res, { globals }, 200);
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Get globals error")
      );
    }
  };

  updateGlobals = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const body = UpdateGlobalsSchema.parse(req.body);
      const globals = await service.updateGlobals(tenantId, body);
      return ok(res, { globals }, 200);
    } catch (error) {
      if (error instanceof ZodError) {
        return fail(res, error.errors[0]?.message ?? "Validation error", 400);
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Update globals error")
      );
    }
  };

  // ——— THEME ———

  getTheme = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const theme = await service.getTheme(tenantId);
      return ok(res, { theme }, 200);
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Get theme error")
      );
    }
  };

  updateTheme = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const body = UpdateThemeSchema.parse(req.body);
      const theme = await service.updateTheme(tenantId, body);
      return ok(res, { theme }, 200);
    } catch (error) {
      if (error instanceof ZodError) {
        return fail(res, error.errors[0]?.message ?? "Validation error", 400);
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Update theme error")
      );
    }
  };

  // ——— SEO ———

  getSeo = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const seo = await service.getSeo(tenantId);
      return ok(res, { seo }, 200);
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Get SEO error")
      );
    }
  };

  updateSeo = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const body = UpdateSeoSchema.parse(req.body);
      const seo = await service.updateSeo(tenantId, body);
      return ok(res, { seo }, 200);
    } catch (error) {
      if (error instanceof ZodError) {
        return fail(res, error.errors[0]?.message ?? "Validation error", 400);
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Update SEO error")
      );
    }
  };

  // ——— ANALYTICS ———

  getAnalytics = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const analytics = await service.getAnalytics(tenantId);
      return ok(res, { analytics }, 200);
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Get analytics error")
      );
    }
  };

  updateAnalytics = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const body = AnalyticsSchema.parse(req.body);
      const analytics = await service.updateAnalytics(tenantId, body);
      return ok(res, { analytics }, 200);
    } catch (error) {
      if (error instanceof ZodError) {
        return fail(res, error.errors[0]?.message ?? "Validation error", 400);
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Update analytics error")
      );
    }
  };
}

export default new SitesController();
