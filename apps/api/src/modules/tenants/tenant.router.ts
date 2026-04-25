/**
 * Tenant Self-Service Routes — tenant-facing domain management.
 * Mounted under /tenants; each route derives tenantId from the JWT,
 * not from a URL parameter, so tenants manage only their own resources.
 */

import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import { asyncHandler } from "@/middlewares/errorHandler";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { requirePermission } from "@/middlewares/requirePermission";
import { workspaceLocator } from "@/shared/permissions/resourceLocator";
import controller from "./tenant.controller";

const router = Router();

router.use(enforceEnvFeature(EnvFeature.TENANT_WEBSITES));

/**
 * @swagger
 * /tenants/me/domains:
 *   get:
 *     summary: List domains for the calling tenant
 *     description: Returns all registered domains for the authenticated tenant.
 *     tags: [Tenants, Domains]
 *     operationId: listMyDomains
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: appType
 *         schema: { type: string, enum: [WEBSITE, IMS, API] }
 *         description: Filter by app type
 *     responses:
 *       200:
 *         description: Domains list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 domains: { type: array, items: { $ref: '#/components/schemas/TenantDomain' } }
 *       403: { description: Forbidden }
 */
router.get(
  "/me/domains",
  requirePermission("SETTINGS.DOMAINS.VIEW", workspaceLocator()),
  asyncHandler(controller.listMyDomains),
);

/**
 * @swagger
 * /tenants/me/domains:
 *   post:
 *     summary: Add a domain to the calling tenant
 *     description: Registers a new hostname for the authenticated tenant.
 *     tags: [Tenants, Domains]
 *     operationId: addMyDomain
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [hostname, appType]
 *             properties:
 *               hostname: { type: string, example: www.acme.com }
 *               appType: { type: string, enum: [WEBSITE, IMS, API] }
 *               isPrimary: { type: boolean }
 *     responses:
 *       201: { description: Domain added }
 *       400: { description: Validation error }
 *       409: { description: Hostname already registered }
 */
router.post(
  "/me/domains",
  requirePermission("SETTINGS.DOMAINS.CREATE", workspaceLocator()),
  asyncHandler(controller.addMyDomain),
);

/**
 * @swagger
 * /tenants/me/domains/{domainId}:
 *   delete:
 *     summary: Delete a domain belonging to the calling tenant
 *     tags: [Tenants, Domains]
 *     operationId: deleteMyDomain
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: domainId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Domain deleted }
 *       404: { description: Domain not found }
 */
router.delete(
  "/me/domains/:domainId",
  requirePermission("SETTINGS.DOMAINS.DELETE", workspaceLocator()),
  asyncHandler(controller.deleteMyDomain),
);

/**
 * @swagger
 * /tenants/me/domains/{domainId}/verification:
 *   get:
 *     summary: Get DNS TXT verification instructions for a domain
 *     tags: [Tenants, Domains]
 *     operationId: getMyDomainVerificationInstructions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: domainId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Verification instructions }
 *       404: { description: Domain not found }
 */
router.get(
  "/me/domains/:domainId/verification",
  requirePermission("SETTINGS.DOMAINS.VIEW", workspaceLocator()),
  asyncHandler(controller.getMyDomainVerification),
);

/**
 * @swagger
 * /tenants/me/domains/{domainId}/verification:
 *   post:
 *     summary: Run DNS TXT verification for a domain
 *     description: Checks the DNS TXT record and marks the domain as verified.
 *     tags: [Tenants, Domains]
 *     operationId: verifyMyDomain
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: domainId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Domain verified }
 *       400: { description: TXT record missing or mismatched }
 *       404: { description: Domain not found }
 */
router.post(
  "/me/domains/:domainId/verification",
  requirePermission("SETTINGS.DOMAINS.UPDATE", workspaceLocator()),
  asyncHandler(controller.verifyMyDomain),
);

export default router;
