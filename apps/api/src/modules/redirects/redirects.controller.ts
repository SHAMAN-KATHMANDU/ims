/**
 * Redirects Controller — thin HTTP layer for redirect management.
 */

import { Request, Response } from "express";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { sendControllerError } from "@/utils/controllerError";
import { ok, fail } from "@/shared/response";
import service from "./redirects.service";
import { CreateRedirectSchema, UpdateRedirectSchema } from "./redirects.schema";

// AppError is an interface so we need to check for statusCode property
type AppErrorType = Error & { statusCode?: number };
const isAppError = (err: unknown): err is AppErrorType => {
  return err instanceof Error && "statusCode" in err;
};

class RedirectsController {
  /**
   * GET /sites/redirects
   * List all redirects for the tenant (active and inactive).
   */
  listRedirects = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const redirects = await service.getAll(tenantId);
      return ok(res, { redirects });
    } catch (error) {
      if (isAppError(error)) {
        return fail(res, error.message, error.statusCode || 500);
      }
      return sendControllerError(req, res, error, "listRedirects");
    }
  };

  /**
   * POST /sites/redirects
   * Create a new redirect.
   */
  createRedirect = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const body = CreateRedirectSchema.parse(req.body);
      const redirect = await service.create(tenantId, body);
      return ok(res, { redirect }, 201);
    } catch (error) {
      if (isAppError(error)) {
        return fail(res, error.message, error.statusCode || 500);
      }
      return sendControllerError(req, res, error, "createRedirect");
    }
  };

  /**
   * GET /sites/redirects/:id
   * Get a single redirect.
   */
  getRedirect = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const { id } = req.params;
      const redirect = await service.getById(tenantId, id);
      return ok(res, { redirect });
    } catch (error) {
      if (isAppError(error)) {
        return fail(res, error.message, error.statusCode || 500);
      }
      return sendControllerError(req, res, error, "getRedirect");
    }
  };

  /**
   * PUT /sites/redirects/:id
   * Update a redirect.
   */
  updateRedirect = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const { id } = req.params;
      const body = UpdateRedirectSchema.parse(req.body);
      const redirect = await service.update(tenantId, id, body);
      return ok(res, { redirect });
    } catch (error) {
      if (isAppError(error)) {
        return fail(res, error.message, error.statusCode || 500);
      }
      return sendControllerError(req, res, error, "updateRedirect");
    }
  };

  /**
   * DELETE /sites/redirects/:id
   * Delete a redirect.
   */
  deleteRedirect = async (req: Request, res: Response) => {
    try {
      const tenantId = getAuthContext(req).tenantId;
      const { id } = req.params;
      const redirect = await service.delete(tenantId, id);
      return ok(res, { redirect });
    } catch (error) {
      if (isAppError(error)) {
        return fail(res, error.message, error.statusCode || 500);
      }
      return sendControllerError(req, res, error, "deleteRedirect");
    }
  };
}

export default new RedirectsController();
