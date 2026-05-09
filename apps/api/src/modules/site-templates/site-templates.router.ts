/**
 * Site template routes — tenant-scoped and platform-scoped.
 */

import { Router } from "express";
import { asyncHandler } from "@/middlewares/errorHandler";
import verifyToken from "@/middlewares/authMiddleware";
import resolveTenant from "@/middlewares/tenantMiddleware";
import controller from "./site-templates.controller";

export const siteTemplatesRouter = Router();

/**
 * Tenant-scoped routes (mounted after verifyToken + resolveTenant).
 */
siteTemplatesRouter.get(
  "/",
  verifyToken,
  resolveTenant,
  asyncHandler(controller.listTemplates),
);

siteTemplatesRouter.get(
  "/:id",
  verifyToken,
  resolveTenant,
  asyncHandler(controller.getTemplate),
);

siteTemplatesRouter.post(
  "/:id/fork",
  verifyToken,
  resolveTenant,
  asyncHandler(controller.forkTemplate),
);

siteTemplatesRouter.patch(
  "/:id",
  verifyToken,
  resolveTenant,
  asyncHandler(controller.updateTemplate),
);

siteTemplatesRouter.delete(
  "/:id",
  verifyToken,
  resolveTenant,
  asyncHandler(controller.deleteFork),
);

/**
 * Platform admin routes.
 */
export const siteTemplatesPlatformRouter = Router();

siteTemplatesPlatformRouter.patch(
  "/:id",
  verifyToken,
  asyncHandler(controller.updateCanonical),
);
