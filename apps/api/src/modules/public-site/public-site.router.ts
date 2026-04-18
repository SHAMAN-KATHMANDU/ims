/**
 * Public Site Router — unauthenticated endpoints served to tenant websites.
 *
 * Tenant is resolved from the request Host header via resolveTenantFromHostname.
 * That middleware also runs the handler chain inside a tenant AsyncLocalStorage
 * context so downstream Prisma queries are auto-scoped.
 *
 * Mount this router BEFORE the auth middleware chain in router.config.ts.
 */

import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import { asyncHandler } from "@/middlewares/errorHandler";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { resolveTenantFromHostname } from "@/middlewares/hostnameResolver";
import { publicReviewRateLimit } from "@/middlewares/publicReviewRateLimit";
import controller from "./public-site.controller";

const router = Router();

// Feature-flagged: when TENANT_WEBSITES is off for the deployment, every
// /public/* route 404s as if the module didn't exist.
router.use(enforceEnvFeature(EnvFeature.TENANT_WEBSITES));

// Required: every request must be addressed to a registered hostname.
router.use(resolveTenantFromHostname());

/**
 * @swagger
 * /public/site:
 *   get:
 *     summary: Get the published site config (branding, contact, features, seo, template) for the request Host
 *     tags: [Public]
 *     responses:
 *       200: { description: Site content }
 *       404: { description: Site not found, not enabled, or not published }
 */
router.get("/site", asyncHandler(controller.getSite));

/**
 * @swagger
 * /public/products:
 *   get:
 *     summary: List published products for the request Host
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 24 }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200: { description: Product list with pagination totals }
 *       400: { description: Validation error }
 *       404: { description: Site not published }
 */
router.get("/products", asyncHandler(controller.listProducts));

/**
 * @swagger
 * /public/products/{id}:
 *   get:
 *     summary: Get a single published product by ID for the request Host
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Product }
 *       404: { description: Product not found or site not published }
 */
router.get("/products/:id", asyncHandler(controller.getProduct));

/**
 * @swagger
 * /public/categories:
 *   get:
 *     summary: List product categories for the request Host
 *     tags: [Public]
 *     responses:
 *       200: { description: Categories list }
 *       404: { description: Site not published }
 */
router.get("/categories", asyncHandler(controller.listCategories));

/**
 * @swagger
 * /public/offers:
 *   get:
 *     summary: Products currently on an active ProductDiscount for the request Host
 *     tags: [Public]
 *     responses:
 *       200: { description: Paginated list of on-offer products }
 *       404: { description: Site not published }
 */
router.get("/offers", asyncHandler(controller.listOffers));

/**
 * @swagger
 * /public/collections/{slug}:
 *   get:
 *     summary: Get a curated collection (featured, exclusives, top-picks, custom) by slug
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 24 }
 *     responses:
 *       200: { description: Collection metadata + ordered products }
 *       404: { description: Collection inactive, missing, or site not published }
 */
router.get("/collections/:slug", asyncHandler(controller.getCollectionBySlug));

/**
 * @swagger
 * /public/products/{id}/reviews:
 *   get:
 *     summary: List APPROVED reviews for a product (newest first, paginated)
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 10 }
 *     responses:
 *       200: { description: Reviews list + totals }
 *       404: { description: Site not published }
 *   post:
 *     summary: Submit a public review — lands as PENDING for moderation
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       201: { description: Review submitted }
 *       400: { description: Validation error }
 *       404: { description: Product not found or site not published }
 *       429: { description: Rate limited }
 */
router.get(
  "/products/:id/reviews",
  asyncHandler(controller.listProductReviews),
);
router.post(
  "/products/:id/reviews",
  publicReviewRateLimit,
  asyncHandler(controller.submitProductReview),
);

export default router;
