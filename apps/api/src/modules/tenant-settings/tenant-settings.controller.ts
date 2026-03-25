import { Request, Response } from "express";
import { ZodError } from "zod";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { sendControllerError } from "@/utils/controllerError";
import { UpsertPaymentMethodsSchema } from "./tenant-settings.schema";
import tenantSettingsService from "./tenant-settings.service";

class TenantSettingsController {
  getPaymentMethods = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const result = await tenantSettingsService.getPaymentMethods(tenantId);
      return res.status(200).json({ message: "OK", ...result });
    } catch (error) {
      return sendControllerError(
        req,
        res,
        error,
        "Get tenant payment methods error",
      );
    }
  };

  upsertPaymentMethods = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const body = UpsertPaymentMethodsSchema.parse(req.body);
      const result = await tenantSettingsService.upsertPaymentMethods(
        tenantId,
        body,
      );
      return res.status(200).json({
        message: "Payment methods updated successfully",
        ...result,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: error.errors[0]?.message ?? "Validation error",
        });
      }
      const appError = error as { statusCode?: number; message?: string };
      if (appError.statusCode) {
        return res
          .status(appError.statusCode)
          .json({ message: appError.message ?? "Bad request" });
      }
      return sendControllerError(
        req,
        res,
        error,
        "Update tenant payment methods error",
      );
    }
  };
}

export default new TenantSettingsController();
