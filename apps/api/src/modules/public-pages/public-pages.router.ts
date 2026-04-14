/**
 * Public Pages Router — unauthenticated read endpoints for tenant custom
 * pages. Mounted under /public/pages BEFORE the auth chain. Tenant is
 * resolved from the request Host header.
 */

import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import { asyncHandler } from "@/middlewares/errorHandler";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { resolveTenantFromHostname } from "@/middlewares/hostnameResolver";
import controller from "./public-pages.controller";

const router = Router();

router.use(enforceEnvFeature(EnvFeature.TENANT_WEBSITES));
router.use(resolveTenantFromHostname());

/**
 * @swagger
 * /public/pages:
 *   get:
 *     summary: List published pages for the request Host (optionally nav-only)
 *     tags: [PublicPages]
 *     parameters:
 *       - in: query
 *         name: nav
 *         schema: { type: boolean }
 */
router.get("/", asyncHandler(controller.listPages));

/**
 * @swagger
 * /public/pages/{slug}:
 *   get:
 *     summary: Get a single published tenant page by slug
 *     tags: [PublicPages]
 */
router.get("/:slug", asyncHandler(controller.getPageBySlug));

export default router;
