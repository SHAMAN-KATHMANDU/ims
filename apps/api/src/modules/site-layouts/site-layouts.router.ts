/**
 * Site Layouts Router — tenant-scoped block layouts.
 * Mounted under /site-layouts; inherits auth + tenant resolution.
 * Permissions: WEBSITE.SITE.* — VIEW/UPDATE/DEPLOY for publish.
 */

import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { asyncHandler } from "@/middlewares/errorHandler";
import { requirePermission } from "@/middlewares/requirePermission";
import { workspaceLocator } from "@/shared/permissions/resourceLocator";
import controller from "./site-layouts.controller";

const router = Router();

router.use(enforceEnvFeature(EnvFeature.TENANT_WEBSITES));
router.use(requirePermission("WEBSITE.SITE.VIEW", workspaceLocator()));

const requireUpdate = requirePermission(
  "WEBSITE.SITE.UPDATE",
  workspaceLocator(),
);
const requireDeploy = requirePermission(
  "WEBSITE.SITE.DEPLOY",
  workspaceLocator(),
);

/**
 * @swagger
 * /site-layouts:
 *   get:
 *     summary: List site layouts for the current tenant
 *     tags: [SiteLayouts]
 *     security:
 *       - bearerAuth: []
 */
router.get("/", asyncHandler(controller.list));

/**
 * @swagger
 * /site-layouts:
 *   put:
 *     summary: Upsert (save draft) a block layout for a scope
 *     tags: [SiteLayouts]
 *     security:
 *       - bearerAuth: []
 */
router.put("/", requireUpdate, asyncHandler(controller.upsert));

/**
 * @swagger
 * /site-layouts/{scope}:
 *   get:
 *     summary: Get one layout by scope (optional pageId query for page scope)
 *     tags: [SiteLayouts]
 *     security:
 *       - bearerAuth: []
 */
router.get("/:scope", asyncHandler(controller.get));

/**
 * @swagger
 * /site-layouts/{scope}/publish:
 *   post:
 *     summary: Promote the draft block tree to published
 *     tags: [SiteLayouts]
 *     security:
 *       - bearerAuth: []
 */
router.post("/:scope/publish", requireDeploy, asyncHandler(controller.publish));

/**
 * @swagger
 * /site-layouts/{scope}/preview-url:
 *   get:
 *     summary: Mint a signed preview URL for the current scope's draft tree
 *     tags: [SiteLayouts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pageId
 *         schema: { type: string, format: uuid }
 */
router.get("/:scope/preview-url", asyncHandler(controller.getPreviewUrl));

/**
 * @swagger
 * /site-layouts/{scope}/reset-from-template:
 *   post:
 *     summary: Replace the draft block tree with the template blueprint
 *     tags: [SiteLayouts]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/:scope/reset-from-template",
  requireUpdate,
  asyncHandler(controller.resetFromTemplate),
);

/**
 * @swagger
 * /site-layouts/{scope}:
 *   delete:
 *     summary: Delete a layout for a scope (optional pageId query for page scope)
 *     tags: [SiteLayouts]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/:scope", requireUpdate, asyncHandler(controller.remove));

export default router;
