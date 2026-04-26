/**
 * Business Profile Controller — thin HTTP layer.
 */

import { Request, Response } from "express";
import { ZodError } from "zod";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { ok, fail } from "@/shared/response";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import { UpdateBusinessProfileSchema } from "./business-profile.schema";
import service, { BusinessProfileService } from "./business-profile.service";

export class BusinessProfileController {
  constructor(private svc: BusinessProfileService) {}

  /**
   * GET /me/business-profile
   * Returns the authenticated tenant's business profile (auto-creates on miss).
   */
  getMine = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const profile = await this.svc.getForTenant(tenantId);
      return ok(res, { profile });
    } catch (error) {
      const appErr = error as AppError;
      if (appErr.statusCode === 401) {
        return fail(res, appErr.message, 401);
      }
      sendControllerError(req, res, error, "getBusinessProfile");
    }
  };

  /**
   * PATCH /me/business-profile
   * Partially updates the authenticated tenant's business profile.
   */
  updateMine = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const body = UpdateBusinessProfileSchema.parse(req.body);
      const profile = await this.svc.updateForTenant(tenantId, body);
      return ok(res, { profile });
    } catch (error) {
      if (error instanceof ZodError) {
        return fail(res, error.errors[0]?.message ?? "Validation error", 400);
      }
      const appErr = error as AppError;
      if (appErr.statusCode === 401) {
        return fail(res, appErr.message, 401);
      }
      sendControllerError(req, res, error, "updateBusinessProfile");
    }
  };
}

export default new BusinessProfileController(service);
