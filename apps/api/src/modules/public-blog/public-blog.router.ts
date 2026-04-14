/**
 * Public Blog Router — unauthenticated read endpoints served to tenant websites.
 *
 * Mounted under /public/blog in router.config.ts BEFORE the auth chain.
 * Tenant is resolved from the request Host header by resolveTenantFromHostname,
 * which also runs the handler inside a tenant AsyncLocalStorage context so
 * Prisma queries are auto-scoped.
 */

import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import { asyncHandler } from "@/middlewares/errorHandler";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { resolveTenantFromHostname } from "@/middlewares/hostnameResolver";
import controller from "./public-blog.controller";

const router = Router();

router.use(enforceEnvFeature(EnvFeature.TENANT_WEBSITES));
router.use(resolveTenantFromHostname());

/**
 * @swagger
 * /public/blog/posts:
 *   get:
 *     summary: List published blog posts for the request Host
 *     tags: [PublicBlog]
 */
router.get("/posts", asyncHandler(controller.listPosts));

/**
 * @swagger
 * /public/blog/featured:
 *   get:
 *     summary: Latest N published blog posts for the homepage featured section
 *     tags: [PublicBlog]
 */
router.get("/featured", asyncHandler(controller.listFeatured));

/**
 * @swagger
 * /public/blog/categories:
 *   get:
 *     summary: All blog categories with published post counts
 *     tags: [PublicBlog]
 */
router.get("/categories", asyncHandler(controller.listCategories));

/**
 * @swagger
 * /public/blog/posts/{slug}:
 *   get:
 *     summary: Get a single published blog post by slug
 *     tags: [PublicBlog]
 */
router.get("/posts/:slug", asyncHandler(controller.getPostBySlug));

export default router;
