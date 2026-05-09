/**
 * Site template controller — HTTP handlers for template management.
 */

import { Request, Response } from "express";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { ok, fail } from "@/shared/response";
import { sendControllerError } from "@/utils/controllerError";
import { createError } from "@/middlewares/errorHandler";
import defaultService from "./site-templates.service";
import {
  ForkTemplateSchema,
  UpdateTemplateSchema,
} from "./site-templates.schema";
import type { SiteTemplatesService } from "./site-templates.service";

type Service = typeof defaultService;

export class SiteTemplatesController {
  constructor(private service: Service = defaultService) {}

  /**
   * GET /site-templates — List canonical + tenant's forks.
   */
  listTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId } = getAuthContext(req);
      const templates = await this.service.listMerged(tenantId);
      ok(res, { templates });
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        fail(res, error.message, 404);
      } else {
        sendControllerError(req, res, error, "listTemplates");
      }
    }
  };

  /**
   * GET /site-templates/:id — Get a single template.
   */
  getTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const template = await this.service.getById(id);
      ok(res, { template });
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        fail(res, error.message, 404);
      } else {
        sendControllerError(req, res, error, "getTemplate");
      }
    }
  };

  /**
   * POST /site-templates/:id/fork — Fork a canonical template.
   */
  forkTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId } = getAuthContext(req);
      const { id } = req.params;
      const body = ForkTemplateSchema.parse(req.body);

      const fork = await this.service.fork(tenantId, id, body.name);
      ok(res, { template: fork }, 201);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          fail(res, error.message, 404);
        } else if (error.message.includes("already")) {
          fail(res, error.message, 409);
        } else if (error.message.includes("Cannot")) {
          fail(res, error.message, 400);
        } else {
          sendControllerError(req, res, error, "forkTemplate");
        }
      } else {
        sendControllerError(req, res, error, "forkTemplate");
      }
    }
  };

  /**
   * PATCH /site-templates/:id — Update a template (fork or canonical for platform admin).
   */
  updateTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId } = getAuthContext(req);
      const { id } = req.params;
      const body = UpdateTemplateSchema.parse(req.body);

      const updated = await this.service.update(id, tenantId, body);
      ok(res, { template: updated });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          fail(res, error.message, 404);
        } else if (
          error.message.includes("Cannot") ||
          error.message.includes("do not own")
        ) {
          fail(res, error.message, 403);
        } else {
          sendControllerError(req, res, error, "updateTemplate");
        }
      } else {
        sendControllerError(req, res, error, "updateTemplate");
      }
    }
  };

  /**
   * DELETE /site-templates/:id — Delete a fork.
   */
  deleteFork = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId } = getAuthContext(req);
      const { id } = req.params;

      await this.service.deleteFork(id, tenantId);
      ok(res, { success: true });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          fail(res, error.message, 404);
        } else if (error.message.includes("Cannot")) {
          fail(res, error.message, 403);
        } else {
          sendControllerError(req, res, error, "deleteFork");
        }
      } else {
        sendControllerError(req, res, error, "deleteFork");
      }
    }
  };

  /**
   * PATCH /platform/site-templates/:id — Update canonical template (platform admin only).
   */
  updateCanonical = async (req: Request, res: Response): Promise<void> => {
    try {
      const { role } = getAuthContext(req);
      const { id } = req.params;
      const body = UpdateTemplateSchema.parse(req.body);

      // Only platform admins can edit canonical templates
      if (role !== "platformAdmin") {
        fail(res, "Only platform admins can edit canonical templates", 403);
        return;
      }

      // Ensure we're updating a canonical template (ownerTenantId IS NULL)
      const template = await this.service.getById(id);
      if (template.ownerTenantId !== null) {
        fail(res, "Can only edit canonical templates via this endpoint", 400);
        return;
      }

      const updated = await this.service.update(id, null, body);
      ok(res, { template: updated });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          fail(res, error.message, 404);
        } else {
          sendControllerError(req, res, error, "updateCanonical");
        }
      } else {
        sendControllerError(req, res, error, "updateCanonical");
      }
    }
  };
}

export default new SiteTemplatesController();
