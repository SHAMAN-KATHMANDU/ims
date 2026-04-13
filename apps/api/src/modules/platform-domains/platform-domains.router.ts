/**
 * Platform Domain Routes — tenant domain CRUD + DNS verification.
 * Mounted under /platform; parent router already enforces platformAdmin role.
 */

import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import { asyncHandler } from "@/middlewares/errorHandler";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import controller from "./platform-domains.controller";

const router = Router();

router.use(enforceEnvFeature(EnvFeature.TENANT_WEBSITES));

/**
 * @swagger
 * /platform/tenants/{tenantId}/domains:
 *   get:
 *     summary: List domains for a tenant
 *     tags: [Platform, Domains]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: appType
 *         schema: { type: string, enum: [WEBSITE, IMS, API] }
 *     responses:
 *       200: { description: Domains list }
 *       404: { description: Tenant not found }
 */
router.get(
  "/tenants/:tenantId/domains",
  asyncHandler(controller.listTenantDomains),
);

/**
 * @swagger
 * /platform/tenants/{tenantId}/domains:
 *   post:
 *     summary: Add a domain to a tenant
 *     tags: [Platform, Domains]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema: { type: string, format: uuid }
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
 *       409: { description: Hostname already registered }
 */
router.post(
  "/tenants/:tenantId/domains",
  asyncHandler(controller.createTenantDomain),
);

/**
 * @swagger
 * /platform/domains/{id}:
 *   patch:
 *     summary: Update a tenant domain (appType, isPrimary)
 *     tags: [Platform, Domains]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Domain updated }
 */
router.patch("/domains/:id", asyncHandler(controller.updateDomain));

/**
 * @swagger
 * /platform/domains/{id}:
 *   delete:
 *     summary: Delete a tenant domain
 *     tags: [Platform, Domains]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Domain deleted }
 */
router.delete("/domains/:id", asyncHandler(controller.deleteDomain));

/**
 * @swagger
 * /platform/domains/{id}/verification:
 *   get:
 *     summary: Fetch DNS TXT verification instructions for a domain
 *     tags: [Platform, Domains]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Verification instructions }
 */
router.get(
  "/domains/:id/verification",
  asyncHandler(controller.getVerificationInstructions),
);

/**
 * @swagger
 * /platform/domains/{id}/verify:
 *   post:
 *     summary: Run DNS TXT verification for a domain
 *     tags: [Platform, Domains]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Domain verified }
 *       400: { description: TXT record missing or mismatched }
 */
router.post("/domains/:id/verify", asyncHandler(controller.verifyDomain));

export default router;
