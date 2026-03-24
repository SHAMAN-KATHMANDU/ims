import { Request, Response } from "express";
import { ZodError } from "zod";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import {
  CreateCrmSourceSchema,
  UpdateCrmSourceSchema,
  CreateCrmJourneyTypeSchema,
  UpdateCrmJourneyTypeSchema,
  ListSourcesQuerySchema,
  ListJourneyTypesQuerySchema,
} from "./crm-settings.schema";
import crmSettingsService from "./crm-settings.service";

const handleAppError = (res: Response, error: unknown): Response | null => {
  if ((error as AppError).statusCode) {
    return res
      .status((error as AppError).statusCode!)
      .json({ message: (error as AppError).message });
  }
  return null;
};

class CrmSettingsController {
  // ── Sources ──────────────────────────────────────────────────────────────

  getAllSources = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const parsed = ListSourcesQuerySchema.safeParse(req.query);
      const query =
        parsed.success &&
        parsed.data &&
        parsed.data.page != null &&
        parsed.data.limit != null
          ? {
              page: parsed.data.page,
              limit: parsed.data.limit,
            }
          : undefined;
      const result = await crmSettingsService.getAllSources(tenantId, query);
      return res.status(200).json({ message: "OK", ...result });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get CRM sources error");
    }
  };

  createSource = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
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
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Create CRM source error")
      );
    }
  };

  updateSource = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
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
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Update CRM source error")
      );
    }
  };

  deleteSource = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      await crmSettingsService.deleteSource(tenantId, req.params.id);
      return res.status(200).json({ message: "Source deleted successfully" });
    } catch (error: unknown) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Delete CRM source error")
      );
    }
  };

  // ── Journey Types ─────────────────────────────────────────────────────────

  getAllJourneyTypes = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const parsed = ListJourneyTypesQuerySchema.safeParse(req.query);
      const query =
        parsed.success &&
        parsed.data &&
        parsed.data.page != null &&
        parsed.data.limit != null
          ? {
              page: parsed.data.page,
              limit: parsed.data.limit,
            }
          : undefined;
      const result = await crmSettingsService.getAllJourneyTypes(
        tenantId,
        query,
      );
      return res.status(200).json({ message: "OK", ...result });
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "Get CRM journey types error",
      );
    }
  };

  createJourneyType = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const body = CreateCrmJourneyTypeSchema.parse(req.body);
      const journeyType = await crmSettingsService.createJourneyType(
        tenantId,
        body,
      );
      return res
        .status(201)
        .json({ message: "Journey type created successfully", journeyType });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Create CRM journey type error")
      );
    }
  };

  updateJourneyType = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const body = UpdateCrmJourneyTypeSchema.parse(req.body);
      const journeyType = await crmSettingsService.updateJourneyType(
        tenantId,
        req.params.id,
        body,
      );
      return res
        .status(200)
        .json({ message: "Journey type updated successfully", journeyType });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Update CRM journey type error")
      );
    }
  };

  deleteJourneyType = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      await crmSettingsService.deleteJourneyType(tenantId, req.params.id);
      return res
        .status(200)
        .json({ message: "Journey type deleted successfully" });
    } catch (error: unknown) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Delete CRM journey type error")
      );
    }
  };
}

export default new CrmSettingsController();
