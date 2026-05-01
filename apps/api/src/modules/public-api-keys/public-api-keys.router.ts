/**
 * Public API Keys Router (admin) — JWT-authenticated endpoints under
 * /api/v1/public-api-keys for tenants to issue, list, rotate and revoke
 * domain-verified read-only keys used by the /public/v1/* surface.
 *
 * Mounted AFTER the verifyToken → resolveTenant chain in router.config.ts.
 */

import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import { asyncHandler } from "@/middlewares/errorHandler";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import controller from "./public-api-keys.controller";

const router = Router();

router.use(enforceEnvFeature(EnvFeature.PUBLIC_DATA_API));

/**
 * @swagger
 * /public-api-keys:
 *   post:
 *     summary: Issue a new public API key bound to a verified tenant domain
 *     tags: [PublicApiKeys]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, tenantDomainId]
 *             properties:
 *               name: { type: string, maxLength: 100 }
 *               tenantDomainId: { type: string, format: uuid }
 *               rateLimitPerMin: { type: integer, minimum: 1, maximum: 10000 }
 *     responses:
 *       201: { description: Key issued — full secret returned ONCE }
 *       400: { description: Validation error or domain not DNS-verified }
 *       404: { description: Tenant domain not found }
 */
router.post("/", asyncHandler(controller.create));

/**
 * @swagger
 * /public-api-keys:
 *   get:
 *     summary: List public API keys for the current tenant (no secrets returned)
 *     tags: [PublicApiKeys]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: List of API keys with prefix + last4 + binding }
 */
router.get("/", asyncHandler(controller.list));

/**
 * @swagger
 * /public-api-keys/{id}/rotate:
 *   post:
 *     summary: Revoke an existing key and issue a replacement bound to the same domain
 *     tags: [PublicApiKeys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Replacement key issued }
 *       404: { description: Key not found }
 */
router.post("/:id/rotate", asyncHandler(controller.rotate));

/**
 * @swagger
 * /public-api-keys/{id}:
 *   delete:
 *     summary: Revoke a public API key
 *     tags: [PublicApiKeys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Key revoked }
 *       404: { description: Key not found }
 */
router.delete("/:id", asyncHandler(controller.revoke));

export default router;
