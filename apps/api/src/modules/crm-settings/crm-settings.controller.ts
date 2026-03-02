import { Request, Response } from "express";
import { ZodError } from "zod";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import {
  CreateCrmSourceSchema,
  UpdateCrmSourceSchema,
} from "./crm-settings.schema";
import crmSettingsService from "./crm-settings.service";

class CrmSettingsController {
  getAllSources = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const sources = await crmSettingsService.getAllSources(tenantId);
      return res.status(200).json({ message: "OK", sources });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get CRM sources error");
    }
  };

  createSource = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const body = CreateCrmSourceSchema.parse(req.body);
      const source = await crmSettingsService.createSource(tenantId, body);
      return res
        .status(201)
        .json({ message: "Source created successfully", source });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Create CRM source error");
    }
  };

  updateSource = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const body = UpdateCrmSourceSchema.parse(req.body);
      const source = await crmSettingsService.updateSource(
        tenantId,
        req.params.id,
        body,
      );
      return res
        .status(200)
        .json({ message: "Source updated successfully", source });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Update CRM source error");
    }
  };

  deleteSource = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      await crmSettingsService.deleteSource(tenantId, req.params.id);
      return res.status(200).json({ message: "Source deleted successfully" });
    } catch (error: unknown) {
      if ((error as AppError).statusCode) {
        return res
          .status((error as AppError).statusCode!)
          .json({ message: (error as AppError).message });
      }
      return sendControllerError(req, res, error, "Delete CRM source error");
    }
  };
}

export default new CrmSettingsController();
