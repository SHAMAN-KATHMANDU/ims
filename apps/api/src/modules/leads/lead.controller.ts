import { Request, Response } from "express";
import { ZodError } from "zod";
import {
  CreateLeadSchema,
  UpdateLeadSchema,
  ConvertLeadSchema,
  AssignLeadSchema,
} from "./lead.schema";
import leadService from "./lead.service";
import { sendControllerError } from "@/utils/controllerError";
import type { AppError } from "@/middlewares/errorHandler";

const handleAppError = (res: Response, error: unknown): Response | null => {
  if ((error as AppError).statusCode) {
    return res
      .status((error as AppError).statusCode!)
      .json({ message: (error as AppError).message });
  }
  return null;
};

class LeadController {
  create = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const tenantId = req.user!.tenantId;
      const body = CreateLeadSchema.parse(req.body);
      const lead = await leadService.create(tenantId, userId, body);
      return res
        .status(201)
        .json({ message: "Lead created successfully", lead });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Create lead error")
      );
    }
  };

  getAll = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const result = await leadService.getAll(tenantId, req.query);
      return res.status(200).json({ message: "OK", ...result });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get leads error");
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const { id } = req.params;
      const lead = await leadService.getById(tenantId, id);
      return res.status(200).json({ message: "OK", lead });
    } catch (error: unknown) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Get lead by id error")
      );
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const { id } = req.params;
      const body = UpdateLeadSchema.parse(req.body);
      const lead = await leadService.update(tenantId, id, body);
      return res
        .status(200)
        .json({ message: "Lead updated successfully", lead });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Update lead error")
      );
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const { id } = req.params;
      await leadService.delete(tenantId, id);
      return res.status(200).json({ message: "Lead deleted successfully" });
    } catch (error: unknown) {
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Delete lead error")
      );
    }
  };

  convert = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const tenantId = req.user!.tenantId;
      const { id } = req.params;
      const body = ConvertLeadSchema.parse(req.body);
      const { lead, contact, deal } = await leadService.convert(
        tenantId,
        userId,
        id,
        body,
      );
      return res.status(200).json({
        message: "Lead converted successfully",
        lead,
        contact,
        deal,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Convert lead error")
      );
    }
  };

  assign = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const tenantId = req.user!.tenantId;
      const { id } = req.params;
      const body = AssignLeadSchema.parse(req.body);
      const lead = await leadService.assign(tenantId, userId, id, body);
      return res.status(200).json({ message: "Lead assigned", lead });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ message: error.errors[0]?.message ?? "Validation error" });
      }
      return (
        handleAppError(res, error) ??
        sendControllerError(req, res, error, "Assign lead error")
      );
    }
  };
}

export default new LeadController();
