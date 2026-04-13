/**
 * Platform Website Feature Routes — enable/disable website feature per tenant.
 * Mounted under /platform; parent router already enforces platformAdmin role.
 */

import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import { asyncHandler } from "@/middlewares/errorHandler";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import controller from "./platform-websites.controller";

const router = Router();

router.use(enforceEnvFeature(EnvFeature.TENANT_WEBSITES));

/**
 * @swagger
 * /platform/site-templates:
 *   get:
 *     summary: List all website templates (platformAdmin)
 *     tags: [Platform, Websites]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Templates list }
 */
router.get("/site-templates", asyncHandler(controller.listTemplates));

/**
 * @swagger
 * /platform/tenants/{tenantId}/website:
 *   get:
 *     summary: Get the website feature config for a tenant
 *     tags: [Platform, Websites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Site config }
 *       404: { description: Tenant or site config not found }
 */
router.get(
  "/tenants/:tenantId/website",
  asyncHandler(controller.getSiteConfig),
);

/**
 * @swagger
 * /platform/tenants/{tenantId}/website/enable:
 *   post:
 *     summary: Enable the website feature for a tenant (optionally pick a template)
 *     tags: [Platform, Websites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               templateSlug: { type: string, example: minimal }
 *     responses:
 *       200: { description: Website enabled, site config returned }
 *       404: { description: Tenant or template not found }
 */
router.post(
  "/tenants/:tenantId/website/enable",
  asyncHandler(controller.enableWebsite),
);

/**
 * @swagger
 * /platform/tenants/{tenantId}/website/disable:
 *   post:
 *     summary: Disable the website feature for a tenant (content is preserved)
 *     tags: [Platform, Websites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Website disabled }
 *       404: { description: Tenant or site config not found }
 */
router.post(
  "/tenants/:tenantId/website/disable",
  asyncHandler(controller.disableWebsite),
);

export default router;
