import { Request, Response } from "express";
import { ZodError } from "zod";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import { DeleteBodySchema } from "@/shared/schemas/deleteBody.schema";
import { CreateVendorSchema, UpdateVendorSchema } from "./vendor.schema";
import vendorService, { VendorService } from "./vendor.service";

class VendorController {
  constructor(private service: VendorService) {}

  createVendor = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const body = CreateVendorSchema.parse(req.body);
      const vendor = await this.service.create(tenantId, body);
      return res
        .status(201)
        .json({ message: "Vendor created successfully", vendor });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      const appErr = error as AppError;
      if (appErr.statusCode === 409) {
        return res.status(409).json({
          message: appErr.message,
          existingVendor: (error as Record<string, unknown>).existingVendor,
        });
      }
      return sendControllerError(req, res, error, "Create vendor error");
    }
  };

  getAllVendors = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const result = await this.service.findAll(tenantId, req.query);
      return res
        .status(200)
        .json({ message: "Vendors fetched successfully", ...result });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get all vendors error");
    }
  };

  getVendorById = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const vendor = await this.service.findById(id, tenantId);
      return res
        .status(200)
        .json({ message: "Vendor fetched successfully", vendor });
    } catch (error: unknown) {
      if ((error as AppError).statusCode === 404) {
        return res.status(404).json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Get vendor by ID error");
    }
  };

  getVendorProducts = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const result = await this.service.findVendorProducts(
        id,
        tenantId,
        req.query,
      );
      return res
        .status(200)
        .json({ message: "Vendor products fetched successfully", ...result });
    } catch (error: unknown) {
      if ((error as AppError).statusCode === 404) {
        return res.status(404).json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Get vendor products error");
    }
  };

  updateVendor = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const body = UpdateVendorSchema.parse(req.body);
      const vendor = await this.service.update(id, tenantId, body);
      return res
        .status(200)
        .json({ message: "Vendor updated successfully", vendor });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      const appErr = error as AppError;
      if (appErr.statusCode === 404) {
        return res.status(404).json({ message: appErr.message });
      }
      if (appErr.statusCode === 409) {
        return res.status(409).json({
          message: appErr.message,
          existingVendor: (error as Record<string, unknown>).existingVendor,
        });
      }
      return sendControllerError(req, res, error, "Update vendor error");
    }
  };

  deleteVendor = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const deleteBody = DeleteBodySchema.parse(req.body ?? {});
      const ip = typeof req.ip === "string" ? req.ip : undefined;
      const userAgent = req.get("user-agent");
      await this.service.delete(id, tenantId, {
        userId,
        reason: deleteBody.reason,
        ip,
        userAgent,
      });
      return res.status(200).json({ message: "Vendor deleted successfully" });
    } catch (error: unknown) {
      const appErr = error as AppError;
      if (appErr.statusCode === 404) {
        return res.status(404).json({ message: appErr.message });
      }
      if (appErr.statusCode === 400) {
        return res.status(400).json({
          message: appErr.message,
          productCount: (error as Record<string, unknown>).productCount,
        });
      }
      return sendControllerError(req, res, error, "Delete vendor error");
    }
  };
}

export default new VendorController(vendorService);
