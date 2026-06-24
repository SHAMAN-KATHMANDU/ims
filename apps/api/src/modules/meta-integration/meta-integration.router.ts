import { Router } from "express";
import { asyncHandler } from "@/middlewares/errorHandler";
import { requirePermission } from "@/middlewares/requirePermission";
import { workspaceLocator } from "@/shared/permissions/resourceLocator";
import metaIntegrationController from "./meta-integration.controller";

const metaIntegrationRouter = Router();

// Viewing the integration (and its masked credentials) requires SETTINGS.META.VIEW.
metaIntegrationRouter.use(
  requirePermission("SETTINGS.META.VIEW", workspaceLocator()),
);

/**
 * @swagger
 * /meta-integration:
 *   get:
 *     summary: Get the tenant's Meta (Facebook) integration (masked — no secrets)
 *     tags: [MetaIntegration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/XTenantSlug'
 *     responses:
 *       200: { description: Masked integration summary }
 */
metaIntegrationRouter.get(
  "/",
  asyncHandler(metaIntegrationController.getSummary),
);

// Everything below mutates configuration → SETTINGS.META.UPDATE.

/**
 * @swagger
 * /meta-integration/app:
 *   put:
 *     summary: Upsert the tenant's own Facebook App ID/Secret and defaults
 *     tags: [MetaIntegration]
 *     security:
 *       - bearerAuth: []
 */
metaIntegrationRouter.put(
  "/app",
  requirePermission("SETTINGS.META.UPDATE", workspaceLocator()),
  asyncHandler(metaIntegrationController.upsertAppCredentials),
);

/**
 * @swagger
 * /meta-integration/webhook/regenerate-token:
 *   post:
 *     summary: Issue a fresh app-level webhook verify token
 *     tags: [MetaIntegration]
 *     security:
 *       - bearerAuth: []
 */
metaIntegrationRouter.post(
  "/webhook/regenerate-token",
  requirePermission("SETTINGS.META.UPDATE", workspaceLocator()),
  asyncHandler(metaIntegrationController.regenerateWebhookToken),
);

/**
 * @swagger
 * /meta-integration/credentials/test:
 *   post:
 *     summary: Validate a Page or Ads access token without storing it
 *     tags: [MetaIntegration]
 *     security:
 *       - bearerAuth: []
 */
metaIntegrationRouter.post(
  "/credentials/test",
  requirePermission("SETTINGS.META.UPDATE", workspaceLocator()),
  asyncHandler(metaIntegrationController.testCredential),
);

/**
 * @swagger
 * /meta-integration/credentials:
 *   post:
 *     summary: Add (or replace) a Page or Ads access token; validated then encrypted
 *     tags: [MetaIntegration]
 *     security:
 *       - bearerAuth: []
 */
metaIntegrationRouter.post(
  "/credentials",
  requirePermission("SETTINGS.META.UPDATE", workspaceLocator()),
  asyncHandler(metaIntegrationController.addCredential),
);

/**
 * @swagger
 * /meta-integration/credentials/{id}:
 *   delete:
 *     summary: Remove a stored Page or Ads access token
 *     tags: [MetaIntegration]
 *     security:
 *       - bearerAuth: []
 */
metaIntegrationRouter.delete(
  "/credentials/:id",
  requirePermission("SETTINGS.META.UPDATE", workspaceLocator()),
  asyncHandler(metaIntegrationController.deleteCredential),
);

export default metaIntegrationRouter;
