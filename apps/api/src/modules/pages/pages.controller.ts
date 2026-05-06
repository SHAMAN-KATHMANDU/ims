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
  listTenantPageVersions,
  restoreTenantPageVersion,
} from "@/modules/versions/versions.service";
import defaultRepo from "./pages.repository";
import type { Prisma } from "@prisma/client";
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
      const { tenantId, userId } = getAuthContext(req);
      const body = CreateTenantPageSchema.parse(req.body);
      const page = await service.createPage(tenantId, body, userId);
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
      const { tenantId, userId } = getAuthContext(req);
      const id = getParam(req, "id");
      const body = UpdateTenantPageSchema.parse(req.body);
      const page = await service.updatePage(tenantId, id, body, userId);
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
      const { tenantId, userId } = getAuthContext(req);
      const id = getParam(req, "id");
      const page = await service.publishPage(tenantId, id, userId);
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
      const { tenantId, userId } = getAuthContext(req);
      const id = getParam(req, "id");
      const page = await service.unpublishPage(tenantId, id, userId);
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

  // ==================== VERSIONS ====================

  listVersions = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const id = getParam(req, "id");
      await service.getPage(tenantId, id);
      const versions = await listTenantPageVersions(tenantId, id);
      return res.status(200).json({ message: "OK", versions });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "List page versions error")
      );
    }
  };

  restoreVersion = async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const id = getParam(req, "id");
      const versionId = getParam(req, "versionId");
      await service.getPage(tenantId, id);
      await restoreTenantPageVersion({
        tenantId,
        editorId: userId,
        versionId,
        updateLive: async (snapshot) => {
          const s = (snapshot ?? {}) as Record<string, unknown>;
          const data: Prisma.TenantPageUpdateInput = {};
          if (typeof s.title === "string") data.title = s.title;
          if (typeof s.slug === "string") data.slug = s.slug;
          if (typeof s.bodyMarkdown === "string")
            data.bodyMarkdown = s.bodyMarkdown;
          if (Array.isArray(s.body))
            data.body = s.body as unknown as Prisma.InputJsonValue;
          if (typeof s.layoutVariant === "string")
            data.layoutVariant = s.layoutVariant;
          if (typeof s.showInNav === "boolean") data.showInNav = s.showInNav;
          if (typeof s.navOrder === "number") data.navOrder = s.navOrder;
          if (typeof s.isPublished === "boolean")
            data.isPublished = s.isPublished;
          if (typeof s.isLandingPage === "boolean")
            data.isLandingPage = s.isLandingPage;
          // Phase 8 — restore page-top customization.
          if (typeof s.coverImageUrl === "string" || s.coverImageUrl === null)
            data.coverImageUrl = (s.coverImageUrl as string | null) ?? null;
          if (typeof s.icon === "string" || s.icon === null)
            data.icon = (s.icon as string | null) ?? null;
          if (typeof s.seoTitle === "string" || s.seoTitle === null)
            data.seoTitle = (s.seoTitle as string | null) ?? null;
          if (typeof s.seoDescription === "string" || s.seoDescription === null)
            data.seoDescription = (s.seoDescription as string | null) ?? null;
          // Restore parent relation (self-relation on TenantPage).
          if (typeof s.parentId === "string") {
            data.parent = { connect: { id: s.parentId } };
          } else if (s.parentId === null) {
            data.parent = { disconnect: true };
          }
          // Phase 4 — preserve any scheduled-publish state recorded at the
          // time of the snapshot.
          if (typeof s.scheduledPublishAt === "string") {
            data.scheduledPublishAt = new Date(s.scheduledPublishAt);
          } else if (s.scheduledPublishAt === null) {
            data.scheduledPublishAt = null;
          }
          // Phase 6 — match the blog controller: a snapshot from before
          // an approval should roll the page back into review state too.
          if (
            s.reviewStatus === "DRAFT" ||
            s.reviewStatus === "IN_REVIEW" ||
            s.reviewStatus === "APPROVED" ||
            s.reviewStatus === "PUBLISHED"
          ) {
            data.reviewStatus = s.reviewStatus;
          }
          const page = await defaultRepo.updatePage(tenantId, id, data);
          return { id: page.id, rowSnapshot: page };
        },
      });
      const page = await service.getPage(tenantId, id);
      return res.status(200).json({ message: "Version restored", page });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Restore page version error")
      );
    }
  };

  getPreviewUrl = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const id = getParam(req, "id");
      const result = await service.mintPreviewUrl(tenantId, id);
      return res.status(200).json({ message: "OK", ...result });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Mint page preview URL error")
      );
    }
  };

  convertToBlocks = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const id = getParam(req, "id");
      const rawMode = (req.body as { mode?: string } | null)?.mode;
      const mode: "convert" | "fresh" =
        rawMode === "fresh" ? "fresh" : "convert";
      const result = await service.convertToBlocks(tenantId, id, mode);
      return res
        .status(201)
        .json({ message: "Page converted to block layout", ...result });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Convert page to blocks error")
      );
    }
  };

  duplicatePage = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const id = getParam(req, "id");
      const page = await service.duplicatePage(tenantId, id);
      return res.status(201).json({ message: "Page duplicated", page });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Duplicate tenant page error")
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
