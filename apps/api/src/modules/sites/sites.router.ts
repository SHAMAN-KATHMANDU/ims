/**
 * Sites Router — tenant-scoped website management.
 * Mounted under /sites; inherits auth + tenant resolution from the main chain.
 * Role: admin or superAdmin (regular users can't edit site content).
 */

import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { asyncHandler } from "@/middlewares/errorHandler";
import controller from "./sites.controller";

const router = Router();

router.use(enforceEnvFeature(EnvFeature.TENANT_WEBSITES));
router.use(authorizeRoles("admin", "superAdmin"));

/**
 * @swagger
 * /sites/config:
 *   get:
 *     summary: Get the current tenant's site config
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Site config }
 *       403: { description: Website feature not enabled for this tenant }
 */
router.get("/config", asyncHandler(controller.getConfig));

/**
 * @swagger
 * /sites/config:
 *   put:
 *     summary: Update the current tenant's site config (branding, contact, features, seo)
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               branding: { type: object, nullable: true }
 *               contact:  { type: object, nullable: true }
 *               features: { type: object, nullable: true }
 *               seo:      { type: object, nullable: true }
 *     responses:
 *       200: { description: Site config updated }
 *       400: { description: Validation error }
 *       403: { description: Website feature not enabled }
 */
router.put("/config", asyncHandler(controller.updateConfig));

/**
 * @swagger
 * /sites/templates:
 *   get:
 *     summary: List available website templates
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Templates list }
 *       403: { description: Website feature not enabled }
 */
router.get("/templates", asyncHandler(controller.listTemplates));

/**
 * @swagger
 * /sites/template:
 *   post:
 *     summary: Pick or switch the template for the current tenant
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [templateSlug]
 *             properties:
 *               templateSlug:  { type: string, example: luxury }
 *               resetBranding: { type: boolean, default: false }
 *     responses:
 *       200: { description: Template applied }
 *       400: { description: Validation or inactive template }
 *       403: { description: Website feature not enabled }
 *       404: { description: Template not found }
 */
router.post("/template", asyncHandler(controller.pickTemplate));

/**
 * @swagger
 * /sites/publish:
 *   post:
 *     summary: Publish the current tenant's site (requires a picked template)
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Site published }
 *       400: { description: No template picked yet }
 *       403: { description: Website feature not enabled }
 */
router.post("/publish", asyncHandler(controller.publish));

/**
 * @swagger
 * /sites/unpublish:
 *   post:
 *     summary: Unpublish the current tenant's site
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Site unpublished }
 *       403: { description: Website feature not enabled }
 */
router.post("/unpublish", asyncHandler(controller.unpublish));

export default router;
