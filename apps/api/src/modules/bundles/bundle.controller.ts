import { Request, Response } from "express";
import { ZodError } from "zod";
import type { AppError } from "@/middlewares/errorHandler";
import { sendControllerError } from "@/utils/controllerError";
import bundleService, { BundleService } from "./bundle.service";
import { CreateBundleSchema, UpdateBundleSchema } from "./bundle.schema";

function getParam(req: Request, key: "id" | "slug"): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : (val ?? "");
}

class BundleController {
  constructor(private service: BundleService) {}

  createBundle = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const body = CreateBundleSchema.parse(req.body);
      const bundle = await this.service.create(tenantId, body);
      return res.status(201).json({ message: "Bundle created", bundle });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      const appErr = error as AppError;
      if (appErr?.statusCode === 409) {
        return res.status(409).json({ message: appErr.message });
      }
      return sendControllerError(req, res, error, "Create bundle error");
    }
  };

  getAllBundles = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const result = await this.service.findAll(tenantId, req.query);
      return res.status(200).json({ message: "Bundles fetched", ...result });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get bundles error");
    }
  };

  getBundleById = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const id = getParam(req, "id");
      const bundle = await this.service.findById(tenantId, id);
      if (!bundle) {
        return res.status(404).json({ message: "Bundle not found" });
      }
      return res.status(200).json({ message: "Bundle fetched", bundle });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get bundle error");
    }
  };

  updateBundle = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const id = getParam(req, "id");
      const body = UpdateBundleSchema.parse(req.body);
      const bundle = await this.service.update(tenantId, id, body);
      if (!bundle) {
        return res.status(404).json({ message: "Bundle not found" });
      }
      return res.status(200).json({ message: "Bundle updated", bundle });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      const appErr = error as AppError;
      if (appErr?.statusCode === 409) {
        return res.status(409).json({ message: appErr.message });
      }
      return sendControllerError(req, res, error, "Update bundle error");
    }
  };

  deleteBundle = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const id = getParam(req, "id");
      const result = await this.service.delete(tenantId, id);
      if (!result) {
        return res.status(404).json({ message: "Bundle not found" });
      }
      return res.status(200).json({ message: "Bundle deleted" });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Delete bundle error");
    }
  };

  listPublicBundles = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const result = await this.service.findAllPublic(tenantId, req.query);
      return res.status(200).json({ message: "Bundles fetched", ...result });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Public bundles error");
    }
  };

  getPublicBundleBySlug = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const slug = getParam(req, "slug");
      const result = await this.service.findPublicBySlug(tenantId, slug);
      if (!result) {
        return res.status(404).json({ message: "Bundle not found" });
      }
      return res.status(200).json({
        message: "Bundle fetched",
        bundle: result.bundle,
        products: result.products,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Public bundle error");
    }
  };
}

export default new BundleController(bundleService);
