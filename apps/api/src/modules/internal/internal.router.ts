/**
 * Internal Routes — server-to-server hooks for Caddy on_demand_tls and the
 * tenant-site Next.js renderer.
 *
 * Mounted BEFORE the JWT auth chain in router.config.ts. Protected by:
 *   1. EnvFeature.TENANT_WEBSITES (routes 404 when flag is off for the env)
 *   2. requireInternalToken (shared-secret header check)
 *
 * Never call these from a browser. Never send a JWT.
 */

import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import { asyncHandler } from "@/middlewares/errorHandler";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { requireInternalToken } from "@/middlewares/requireInternalToken";
import controller from "./internal.controller";

const router = Router();

/**
 * @swagger
 * /internal/tenants/{slug}/business-profile:
 *   get:
 *     summary: Get public business profile for a tenant (no auth)
 *     description: |
 *       Returns the tenant's business profile with sensitive tax fields
 *       (panNumber, vatNumber, taxId, registrationNumber) omitted.
 *       Used by the tenant-site renderer and receipt generator.
 *     tags: [Internal]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *         description: Tenant URL slug
 *     responses:
 *       200:
 *         description: Business profile (null profile if none set yet)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 profile:
 *                   oneOf:
 *                     - type: "null"
 *                     - $ref: '#/components/schemas/PublicBusinessProfile'
 *       404:
 *         description: Tenant not found
 */
router.get(
  "/tenants/:slug/business-profile",
  asyncHandler(controller.getPublicBusinessProfile),
);

router.use(enforceEnvFeature(EnvFeature.TENANT_WEBSITES));
router.use(requireInternalToken);

/**
 * @swagger
 * /internal/domain-allowed:
 *   get:
 *     summary: Caddy on_demand_tls ask hook — should a TLS cert be issued for this host?
 *     description: |
 *       Strict gate. Returns 200 only if:
 *       1. hostname exists in tenant_domains
 *       2. tenant is active
 *       3. appType is WEBSITE
 *       4. domain is verified (TXT check passed)
 *       5. SiteConfig.websiteEnabled is true
 *       Returns 403 otherwise so Caddy refuses cert issuance.
 *     tags: [Internal]
 *     parameters:
 *       - in: query
 *         name: domain
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Domain is allowed, Caddy may issue cert }
 *       400: { description: Invalid query }
 *       401: { description: Missing/invalid X-Internal-Token }
 *       403: { description: Domain denied — see "reason" field }
 *       503: { description: Internal API token not configured }
 */
router.get("/domain-allowed", asyncHandler(controller.domainAllowed));

/**
 * @swagger
 * /internal/resolve-host:
 *   get:
 *     summary: Resolve a Host header to a tenant (tenant-site renderer middleware)
 *     tags: [Internal]
 *     parameters:
 *       - in: query
 *         name: host
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Host resolved to a tenant with a published site }
 *       400: { description: Invalid query }
 *       401: { description: Missing/invalid X-Internal-Token }
 *       404: { description: Host does not map to a published tenant }
 *       503: { description: Internal API token not configured }
 */
router.get("/resolve-host", asyncHandler(controller.resolveHost));

export default router;
