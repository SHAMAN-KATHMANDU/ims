/**
 * Public site preview router — unauthenticated, token-gated draft preview
 * of entire-scope block layouts for the Framer-lite editor iframe.
 *
 * Tenant context comes from the HMAC-signed `token` query param, NOT from
 * the Host header, so we intentionally do NOT use resolveTenantFromHostname
 * here. Mount this router BEFORE any host-resolving router in the main
 * router config (same pattern as public-page-preview).
 */

import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import { asyncHandler } from "@/middlewares/errorHandler";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import controller from "./public-site-preview.controller";

const router = Router();

router.use(enforceEnvFeature(EnvFeature.TENANT_WEBSITES));

/**
 * @swagger
 * /public/preview/site/{scope}:
 *   get:
 *     summary: Fetch a draft SiteLayout + tenant context for one scope
 *     tags: [PublicSitePreview]
 *     parameters:
 *       - in: path
 *         name: scope
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: productId
 *         schema: { type: string }
 */
router.get("/:scope", asyncHandler(controller.getSitePreview));

export default router;
