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
      const tenantId = getAuthContext(req).tenantId;
      const body = CreateBlogPostSchema.parse(req.body);
      const post = await service.createPost(tenantId, body);
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
      const tenantId = getAuthContext(req).tenantId;
      const id = getParam(req, "id");
      const body = UpdateBlogPostSchema.parse(req.body);
      const post = await service.updatePost(tenantId, id, body);
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
      const tenantId = getAuthContext(req).tenantId;
      const id = getParam(req, "id");
      const post = await service.publishPost(tenantId, id);
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
      const tenantId = getAuthContext(req).tenantId;
      const id = getParam(req, "id");
      const post = await service.unpublishPost(tenantId, id);
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
