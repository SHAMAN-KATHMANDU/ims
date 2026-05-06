/**
 * Blog Controller — thin HTTP layer for tenant-scoped blog management.
 */

import { Request, Response } from "express";
import { ZodError } from "zod";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import service from "./blog.service";
import {
  CreateBlogCategorySchema,
  CreateBlogPostSchema,
  ListBlogPostsQuerySchema,
  UpdateBlogCategorySchema,
  UpdateBlogPostSchema,
} from "./blog.schema";
import {
  listBlogPostVersions,
  restoreBlogPostVersion,
} from "@/modules/versions/versions.service";
import defaultRepo from "./blog.repository";
import { computeReadingMinutes } from "./blog.schema";
import type { Prisma } from "@prisma/client";

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

class BlogController {
  // ==================== POSTS ====================

  listPosts = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const query = ListBlogPostsQuerySchema.parse(req.query);
      const result = await service.listPosts(tenantId, query);
      return res.status(200).json({ message: "OK", ...result });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "List blog posts error")
      );
    }
  };

  getPost = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const id = getParam(req, "id");
      const post = await service.getPost(tenantId, id);
      return res.status(200).json({ message: "OK", post });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Get blog post error")
      );
    }
  };

  createPost = async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const body = CreateBlogPostSchema.parse(req.body);
      const post = await service.createPost(tenantId, body, userId);
      return res.status(201).json({ message: "Blog post created", post });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Create blog post error")
      );
    }
  };

  updatePost = async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const id = getParam(req, "id");
      const body = UpdateBlogPostSchema.parse(req.body);
      const post = await service.updatePost(tenantId, id, body, userId);
      return res.status(200).json({ message: "Blog post updated", post });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Update blog post error")
      );
    }
  };

  publishPost = async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const id = getParam(req, "id");
      const post = await service.publishPost(tenantId, id, userId);
      return res.status(200).json({ message: "Blog post published", post });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Publish blog post error")
      );
    }
  };

  unpublishPost = async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const id = getParam(req, "id");
      const post = await service.unpublishPost(tenantId, id, userId);
      return res.status(200).json({ message: "Blog post unpublished", post });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Unpublish blog post error")
      );
    }
  };

  deletePost = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const id = getParam(req, "id");
      await service.deletePost(tenantId, id);
      return res.status(200).json({ message: "Blog post deleted" });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Delete blog post error")
      );
    }
  };

  // ==================== VERSIONS ====================

  listVersions = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const id = getParam(req, "id");
      // Confirm post belongs to tenant before exposing version list.
      await service.getPost(tenantId, id);
      const versions = await listBlogPostVersions(tenantId, id);
      return res.status(200).json({ message: "OK", versions });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "List blog post versions error")
      );
    }
  };

  restoreVersion = async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const id = getParam(req, "id");
      const versionId = getParam(req, "versionId");
      // Confirm parent ownership.
      await service.getPost(tenantId, id);
      await restoreBlogPostVersion({
        tenantId,
        editorId: userId,
        versionId,
        updateLive: async (snapshot) => {
          // Project the JSON snapshot into a Prisma update payload. We
          // explicitly enumerate the fields we replay; createdAt + id stay
          // immutable.
          const s = (snapshot ?? {}) as Record<string, unknown>;
          const data: Prisma.BlogPostUpdateInput = {};
          if (typeof s.title === "string") data.title = s.title;
          if (typeof s.slug === "string") data.slug = s.slug;
          if (typeof s.excerpt === "string" || s.excerpt === null)
            data.excerpt = (s.excerpt as string | null) ?? null;
          if (typeof s.bodyMarkdown === "string") {
            data.bodyMarkdown = s.bodyMarkdown;
            // Recompute the derived reading-minutes column so search /
            // post lists don't surface a stale value after a restore.
            data.readingMinutes = computeReadingMinutes(s.bodyMarkdown);
          }
          if (Array.isArray(s.body))
            data.body = s.body as unknown as Prisma.InputJsonValue;
          if (typeof s.heroImageUrl === "string" || s.heroImageUrl === null)
            data.heroImageUrl = (s.heroImageUrl as string | null) ?? null;
          // Phase 8 — restore page-top customization fields too.
          if (typeof s.coverImageUrl === "string" || s.coverImageUrl === null)
            data.coverImageUrl = (s.coverImageUrl as string | null) ?? null;
          if (typeof s.icon === "string" || s.icon === null)
            data.icon = (s.icon as string | null) ?? null;
          if (typeof s.authorName === "string" || s.authorName === null)
            data.authorName = (s.authorName as string | null) ?? null;
          if (typeof s.seoTitle === "string" || s.seoTitle === null)
            data.seoTitle = (s.seoTitle as string | null) ?? null;
          if (typeof s.seoDescription === "string" || s.seoDescription === null)
            data.seoDescription = (s.seoDescription as string | null) ?? null;
          if (Array.isArray(s.tags)) data.tags = s.tags as string[];
          // Restore the category relation. Prisma needs `connect` /
          // `disconnect` for relations, not a raw FK assignment.
          if (typeof s.categoryId === "string") {
            data.category = { connect: { id: s.categoryId } };
          } else if (s.categoryId === null) {
            data.category = { disconnect: true };
          }
          // Phase 4 — restoring an older snapshot should preserve any
          // pending schedule that existed at that point in time.
          if (typeof s.scheduledPublishAt === "string") {
            data.scheduledPublishAt = new Date(s.scheduledPublishAt);
          } else if (s.scheduledPublishAt === null) {
            data.scheduledPublishAt = null;
          }
          // The schema docstring promises "every other field" is replayed.
          // Restore lifecycle state too, otherwise a draft-era snapshot
          // restored into a now-published post leaves it PUBLISHED with the
          // older title/body — a confusing partial revert.
          if (
            s.status === "DRAFT" ||
            s.status === "PUBLISHED" ||
            s.status === "ARCHIVED"
          ) {
            data.status = s.status;
          }
          if (typeof s.publishedAt === "string") {
            data.publishedAt = new Date(s.publishedAt);
          } else if (s.publishedAt === null) {
            data.publishedAt = null;
          }
          if (
            s.reviewStatus === "DRAFT" ||
            s.reviewStatus === "IN_REVIEW" ||
            s.reviewStatus === "APPROVED" ||
            s.reviewStatus === "PUBLISHED"
          ) {
            data.reviewStatus = s.reviewStatus;
          }
          const post = await defaultRepo.updatePost(tenantId, id, data);
          return { id: post.id, rowSnapshot: post };
        },
      });
      const post = await service.getPost(tenantId, id);
      return res.status(200).json({ message: "Version restored", post });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Restore blog post version error")
      );
    }
  };

  // ==================== CATEGORIES ====================

  listCategories = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const categories = await service.listCategories(tenantId);
      return res.status(200).json({ message: "OK", categories });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "List blog categories error")
      );
    }
  };

  createCategory = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const body = CreateBlogCategorySchema.parse(req.body);
      const category = await service.createCategory(tenantId, body);
      return res
        .status(201)
        .json({ message: "Blog category created", category });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Create blog category error")
      );
    }
  };

  updateCategory = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const id = getParam(req, "id");
      const body = UpdateBlogCategorySchema.parse(req.body);
      const category = await service.updateCategory(tenantId, id, body);
      return res
        .status(200)
        .json({ message: "Blog category updated", category });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Update blog category error")
      );
    }
  };

  deleteCategory = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const id = getParam(req, "id");
      await service.deleteCategory(tenantId, id);
      return res.status(200).json({ message: "Blog category deleted" });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Delete blog category error")
      );
    }
  };
}

export default new BlogController();
