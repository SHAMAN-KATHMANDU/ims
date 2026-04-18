/**
 * Public Site Controller — thin HTTP layer. Tenant is resolved from the
 * request Host header (see resolveTenantFromHostname middleware), not from
 * JWT; req.tenant is populated by the resolver.
 */

import { Request, Response } from "express";
import { ZodError } from "zod";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import service from "./public-site.service";
import {
  ListProductsQuerySchema,
  ListReviewsPublicQuerySchema,
  SubmitReviewSchema,
} from "./public-site.schema";

function getTenantId(req: Request): string {
  const tenantId = req.tenant?.id;
  if (!tenantId) {
    // Shouldn't happen — the router mounts the resolver as the first
    // middleware. This is a safety net so a misconfigured route can't leak
    // data from another tenant.
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

class PublicSiteController {
  getSite = async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const site = await service.getSite(tenantId);
      return res.status(200).json({ message: "OK", site });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Get public site error")
      );
    }
  };

  listProducts = async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const query = ListProductsQuerySchema.parse(req.query);
      const result = await service.listProducts(tenantId, query);
      return res.status(200).json({ message: "OK", ...result });
    } catch (error) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "List public products error")
      );
    }
  };

  getProduct = async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const id = getParam(req, "id");
      const product = await service.getProduct(tenantId, id);
      return res.status(200).json({ message: "OK", product });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Get public product error")
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
        sendControllerError(req, res, error, "List public categories error")
      );
    }
  };

  listOffers = async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const query = ListProductsQuerySchema.parse(req.query);
      const result = await service.listOffers(tenantId, query);
      return res.status(200).json({ message: "OK", ...result });
    } catch (error) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "List public offers error")
      );
    }
  };

  listProductReviews = async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const id = getParam(req, "id");
      const query = ListReviewsPublicQuerySchema.parse(req.query);
      const result = await service.listProductReviews(tenantId, id, query);
      return res.status(200).json({ message: "OK", ...result });
    } catch (error) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "List product reviews error")
      );
    }
  };

  submitProductReview = async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const id = getParam(req, "id");
      const body = SubmitReviewSchema.parse(req.body);
      // req.ip honors trust-proxy; we truncate to 64 chars to match the
      // submitted_ip column and avoid accidental IPv6 overflow.
      const ip = (req.ip ?? "").slice(0, 64) || null;
      const review = await service.submitProductReview(tenantId, id, body, ip);
      return res.status(201).json({ message: "Review submitted", review });
    } catch (error) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Submit product review error")
      );
    }
  };

  listFrequentlyBoughtWith = async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const id = getParam(req, "id");
      const result = await service.listFrequentlyBoughtWith(tenantId, id);
      return res.status(200).json({ message: "OK", ...result });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(
          req,
          res,
          error,
          "List frequently-bought-with error",
        )
      );
    }
  };

  getCollectionBySlug = async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const slug = getParam(req, "slug");
      const limitRaw = Number(req.query.limit);
      const limit =
        Number.isFinite(limitRaw) && limitRaw > 0
          ? Math.min(100, Math.max(1, Math.floor(limitRaw)))
          : 24;
      const collection = await service.getCollectionBySlug(
        tenantId,
        slug,
        limit,
      );
      return res.status(200).json({ message: "OK", collection });
    } catch (error) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Get public collection error")
      );
    }
  };
}

export default new PublicSiteController();
