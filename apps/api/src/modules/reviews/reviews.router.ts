/**
 * Reviews router — tenant-admin moderation endpoints.
 * Mounted under /reviews; inherits auth + tenant resolution.
 * Permissions: WEBSITE.REVIEWS.* — VIEW for list, APPROVE/REJECT/REPLY for
 *              updates (service layer infers action from payload), DELETE.
 */

import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { asyncHandler } from "@/middlewares/errorHandler";
import { requirePermission } from "@/middlewares/requirePermission";
import {
  paramLocator,
  workspaceLocator,
} from "@/shared/permissions/resourceLocator";
import controller from "./reviews.controller";

const router = Router();

router.use(enforceEnvFeature(EnvFeature.TENANT_WEBSITES));
router.use(requirePermission("WEBSITE.REVIEWS.VIEW", workspaceLocator()));

router.get("/", asyncHandler(controller.list));
// The update endpoint covers approve/reject/reply; service layer asserts the
// precise WEBSITE.REVIEWS.{APPROVE,REJECT,REPLY} permission based on payload.
router.patch(
  "/:id",
  requirePermission("WEBSITE.REVIEWS.APPROVE", paramLocator("REVIEW")),
  asyncHandler(controller.update),
);
router.delete(
  "/:id",
  requirePermission("WEBSITE.REVIEWS.DELETE", paramLocator("REVIEW")),
  asyncHandler(controller.remove),
);

export default router;
