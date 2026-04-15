/**
 * Public page preview router — unauthenticated, token-gated.
 *
 * Tenant context is carried by the HMAC-signed `token` query param, not by
 * the Host header, so we deliberately do NOT use resolveTenantFromHostname
 * here. The preview iframe lives on the tenant-site, but the request itself
 * may originate from any host the admin has the iframe pointed at.
 *
 * The TENANT_WEBSITES env feature gate still applies — if the platform
 * doesn't have websites enabled, no previews exist either.
 */

import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import { asyncHandler } from "@/middlewares/errorHandler";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import controller from "./public-page-preview.controller";

const router = Router();

router.use(enforceEnvFeature(EnvFeature.TENANT_WEBSITES));

/**
 * @swagger
 * /public/preview/page/{id}:
 *   get:
 *     summary: Fetch a draft tenant page by id, gated by an HMAC preview token
 *     tags: [PublicPagePreview]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: "{ page, branding }" }
 *       400: { description: Missing token }
 *       401: { description: Invalid or expired token, or token/page mismatch }
 *       404: { description: Page not found }
 */
router.get("/:id", asyncHandler(controller.getDraftPreview));

export default router;
