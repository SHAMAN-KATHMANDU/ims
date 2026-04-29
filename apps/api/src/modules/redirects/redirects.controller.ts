/**
 * Redirects Controller — thin HTTP layer for tenant URL redirect rules.
 */

import { Request, Response } from "express";
import { ZodError } from "zod";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { sendControllerError } from "@/utils/controllerError";
import type { AppError } from "@/middlewares/errorHandler";
import { ok, fail } from "@/shared/response";
import service from "./redirects.service";
import { CreateRedirectSchema, UpdateRedirectSchema } from "./redirects.schema";

function isAppError(err: unknown): err is AppError {
  return (
    typeof err === "object" &&
    err !== null &&
    typeof (err as AppError).statusCode === "number"
  );
}

class RedirectsController {
  listRedirects = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const redirects = await service.listAll(tenantId);
      return ok(res, { redirects });
    } catch (error) {
      if (isAppError(error)) return fail(res, error.message, error.statusCode);
      return sendControllerError(req, res, error, "listRedirects");
    }
  };

  createRedirect = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const body = CreateRedirectSchema.parse(req.body);
      const redirect = await service.create(tenantId, body);
      return ok(res, { redirect }, 201);
    } catch (error) {
      if (error instanceof ZodError)
        return fail(res, error.errors[0]?.message ?? "Validation error", 400);
      if (isAppError(error)) return fail(res, error.message, error.statusCode);
      return sendControllerError(req, res, error, "createRedirect");
    }
  };

  getRedirect = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const { id } = req.params as { id: string };
      const redirect = await service.getById(id, tenantId);
      return ok(res, { redirect });
    } catch (error) {
      if (isAppError(error)) return fail(res, error.message, error.statusCode);
      return sendControllerError(req, res, error, "getRedirect");
    }
  };

  updateRedirect = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const { id } = req.params as { id: string };
      const body = UpdateRedirectSchema.parse(req.body);
      const redirect = await service.update(id, tenantId, body);
      return ok(res, { redirect });
    } catch (error) {
      if (error instanceof ZodError)
        return fail(res, error.errors[0]?.message ?? "Validation error", 400);
      if (isAppError(error)) return fail(res, error.message, error.statusCode);
      return sendControllerError(req, res, error, "updateRedirect");
    }
  };

  deleteRedirect = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const { id } = req.params as { id: string };
      await service.delete(id, tenantId);
      return ok(res, { message: "Redirect deleted" });
    } catch (error) {
      if (isAppError(error)) return fail(res, error.message, error.statusCode);
      return sendControllerError(req, res, error, "deleteRedirect");
    }
  };
}

export default new RedirectsController();
