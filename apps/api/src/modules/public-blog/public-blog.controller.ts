/**
 * Public Blog Controller — thin HTTP layer. Tenant comes from
 * resolveTenantFromHostname (req.tenant), not JWT.
 */

import { Request, Response } from "express";
import { ZodError } from "zod";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import service from "./public-blog.service";
import {
  FeaturedQuerySchema,
  ListPublicPostsQuerySchema,
} from "./public-blog.schema";

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

class PublicBlogController {
  listPosts = async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const query = ListPublicPostsQuerySchema.parse(req.query);
      const result = await service.listPosts(tenantId, query);
      return res.status(200).json({ message: "OK", ...result });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "List public blog posts error")
      );
    }
  };

  getPostBySlug = async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const slug = getParam(req, "slug");
      const { post, related } = await service.getPostBySlug(tenantId, slug);
      return res.status(200).json({ message: "OK", post, related });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Get public blog post error")
      );
    }
  };

  listFeatured = async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const query = FeaturedQuerySchema.parse(req.query);
      const posts = await service.listFeatured(tenantId, query);
      return res.status(200).json({ message: "OK", posts });
    } catch (error) {
      return (
        handleZodError(res, error) ??
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "List featured blog posts error")
      );
    }
  };

  listCategories = async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const categories = await service.listCategories(tenantId);
      return res.status(200).json({ message: "OK", categories });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(
          req,
          res,
          error,
          "List public blog categories error",
        )
      );
    }
  };
}

export default new PublicBlogController();
