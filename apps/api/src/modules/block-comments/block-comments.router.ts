/**
 * Block-comments router — Phase 6 inline review threads.
 *
 * Behind CMS_REVIEW_WORKFLOW. Permissions piggyback on
 * WEBSITE.PAGES (writers can comment; admins control resolution).
 */

import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { asyncHandler } from "@/middlewares/errorHandler";
import { requirePermission } from "@/middlewares/requirePermission";
import { workspaceLocator } from "@/shared/permissions/resourceLocator";
import controller from "./block-comments.controller";

const router = Router();

router.use(enforceEnvFeature(EnvFeature.TENANT_WEBSITES));
router.use(enforceEnvFeature(EnvFeature.CMS_REVIEW_WORKFLOW));

router.get(
  "/",
  requirePermission("WEBSITE.PAGES.VIEW", workspaceLocator()),
  asyncHandler(controller.list),
);

router.post(
  "/",
  requirePermission("WEBSITE.PAGES.UPDATE", workspaceLocator()),
  asyncHandler(controller.create),
);

router.post(
  "/:id/resolve",
  requirePermission("WEBSITE.PAGES.UPDATE", workspaceLocator()),
  asyncHandler(controller.resolve),
);

router.post(
  "/:id/reopen",
  requirePermission("WEBSITE.PAGES.UPDATE", workspaceLocator()),
  asyncHandler(controller.reopen),
);

router.delete(
  "/:id",
  requirePermission("WEBSITE.PAGES.UPDATE", workspaceLocator()),
  asyncHandler(controller.remove),
);

export default router;
