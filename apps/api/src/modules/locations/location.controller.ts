import { Request, Response } from "express";
import { ZodError } from "zod";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import { DeleteBodySchema } from "@/shared/schemas/deleteBody.schema";
import { CreateLocationSchema, UpdateLocationSchema } from "./location.schema";
import locationService, { LocationService } from "./location.service";

class LocationController {
  constructor(private service: LocationService) {}

  createLocation = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const body = CreateLocationSchema.parse(req.body);
      const result = await this.service.create(tenantId, body);
      const message = result.restored
        ? "Location restored successfully"
        : "Location created successfully";
      return res.status(201).json({
        message,
        location: result.location,
        ...(result.restored && { restored: true }),
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      const appErr = error as AppError;
      if (appErr.statusCode === 409) {
        return res.status(409).json({ message: appErr.message });
      }
      return sendControllerError(req, res, error, "Create location error");
    }
  };

  getAllLocations = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const typeFilter = req.query.type as string | undefined;
      const activeOnly = req.query.activeOnly === "true";
      const statusFilter = req.query.status as string | undefined;
      const result = await this.service.findAll(tenantId, req.query, {
        type: typeFilter,
        activeOnly,
        status: statusFilter,
      });
      return res.status(200).json({
        message: "Locations fetched successfully",
        ...result,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get all locations error");
    }
  };

  getLocationById = async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const tenantId = req.user!.tenantId;
      const location = await this.service.findById(id, tenantId);
      return res.status(200).json({
        message: "Location fetched successfully",
        location,
      });
    } catch (error: unknown) {
      const appErr = error as AppError;
      if (appErr.statusCode === 404) {
        return res.status(404).json({ message: appErr.message });
      }
      return sendControllerError(req, res, error, "Get location by ID error");
    }
  };

  updateLocation = async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const tenantId = req.user!.tenantId;
      const body = UpdateLocationSchema.parse(req.body);
      const location = await this.service.update(id, body, tenantId);
      return res.status(200).json({
        message: "Location updated successfully",
        location,
      });
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
        return res.status(409).json({ message: appErr.message });
      }
      if (appErr.statusCode === 400) {
        return res.status(400).json({ message: appErr.message });
      }
      return sendControllerError(req, res, error, "Update location error");
    }
  };

  deleteLocation = async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const deleteBody = DeleteBodySchema.parse(req.body ?? {});
      const ip = typeof req.ip === "string" ? req.ip : undefined;
      const userAgent = req.get("user-agent");
      await this.service.delete(id, tenantId, {
        userId,
        reason: deleteBody.reason,
        ip,
        userAgent,
      });
      return res.status(200).json({
        message: "Location deactivated successfully",
      });
    } catch (error: unknown) {
      const appErr = error as AppError;
      if (appErr.statusCode === 404) {
        return res.status(404).json({ message: appErr.message });
      }
      if (appErr.statusCode === 400) {
        return res.status(400).json({ message: appErr.message });
      }
      return sendControllerError(req, res, error, "Delete location error");
    }
  };

  restoreLocation = async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const tenantId = req.user!.tenantId;
      const location = await this.service.restore(id, tenantId);
      return res.status(200).json({
        message: "Location reactivated successfully",
        location,
      });
    } catch (error: unknown) {
      const appErr = error as AppError;
      if (appErr.statusCode === 404) {
        return res.status(404).json({ message: appErr.message });
      }
      if (appErr.statusCode === 400) {
        return res.status(400).json({ message: appErr.message });
      }
      return sendControllerError(req, res, error, "Restore location error");
    }
  };

  getLocationInventory = async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const result = await this.service.getInventory(id, req.query);
      return res.status(200).json({
        message: "Location inventory fetched successfully",
        ...result,
      });
    } catch (error: unknown) {
      const appErr = error as AppError;
      if (appErr.statusCode === 404) {
        return res.status(404).json({ message: appErr.message });
      }
      return sendControllerError(
        req,
        res,
        error,
        "Get location inventory error",
      );
    }
  };
}

export default new LocationController(locationService);
