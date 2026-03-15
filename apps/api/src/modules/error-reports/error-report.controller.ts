import { Request, Response } from "express";
import { ZodError } from "zod";
import { sendControllerError } from "@/utils/controllerError";
import {
  CreateErrorReportSchema,
  UpdateErrorReportStatusSchema,
} from "./error-report.schema";
import errorReportService, { ErrorReportService } from "./error-report.service";

function parseId(req: Request): string {
  const raw = req.params.id;
  return Array.isArray(raw) ? raw[0] : raw;
}

class ErrorReportController {
  constructor(private service: ErrorReportService) {}

  create = async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenantId ?? null;
      const userId = req.user!.id;
      const body = CreateErrorReportSchema.parse(req.body);
      const report = await this.service.create(tenantId, userId, body);
      return res.status(201).json({
        message: "Error report submitted",
        report,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: error.errors[0]?.message ?? "Validation error",
        });
      }
      return sendControllerError(req, res, error, "Create error report failed");
    }
  };

  list = async (req: Request, res: Response) => {
    try {
      const tenantId =
        req.user?.role === "platformAdmin"
          ? null
          : (req.user?.tenantId ?? null);
      const result = await this.service.list(tenantId, req.query);
      return res.status(200).json({
        message: "Error reports fetched",
        ...result,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "List error reports failed");
    }
  };

  updateStatus = async (req: Request, res: Response) => {
    try {
      if (req.user?.role !== "platformAdmin") {
        return res.status(403).json({
          message:
            "Only platform administrators can change error report status",
        });
      }
      const id = parseId(req);
      const body = UpdateErrorReportStatusSchema.parse(req.body);
      const report = await this.service.updateStatus(id, body.status);
      return res.status(200).json({
        message: "Status updated",
        report,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: error.errors[0]?.message ?? "Validation error",
        });
      }
      return sendControllerError(
        req,
        res,
        error,
        "Update error report status failed",
      );
    }
  };
}

const errorReportController = new ErrorReportController(errorReportService);
export default errorReportController;
