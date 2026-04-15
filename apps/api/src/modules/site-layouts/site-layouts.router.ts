/**
 * Site Layouts Router — tenant-scoped block layouts.
 * Mounted under /site-layouts; inherits auth + tenant resolution.
 * Role: admin or superAdmin.
 */

import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { asyncHandler } from "@/middlewares/errorHandler";
import controller from "./site-layouts.controller";

const router = Router();

router.use(enforceEnvFeature(EnvFeature.TENANT_WEBSITES));
router.use(authorizeRoles("admin", "superAdmin"));

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
router.put("/", asyncHandler(controller.upsert));

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
router.post("/:scope/publish", asyncHandler(controller.publish));

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
 * /site-layouts/{scope}:
 *   delete:
 *     summary: Delete a layout for a scope (optional pageId query for page scope)
 *     tags: [SiteLayouts]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/:scope", asyncHandler(controller.remove));

export default router;
