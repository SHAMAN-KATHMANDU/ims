/**
 * Public Data API Router — `/public/v1/*`
 *
 * Read-only, JSON-only surface for third-party frontends running on a
 * customer's own infrastructure. Tenant resolution is by API key (not
 * hostname): the tenant authenticates with `Authorization: Bearer pk_live_...`
 * and the request `Origin` must match the verified domain bound to the key.
 *
 * Middleware order matters:
 *   1. enforceEnvFeature(PUBLIC_DATA_API)  — kill-switch
 *   2. readOnlyGuard                       — 405s anything that isn't GET/HEAD/OPTIONS
 *   3. publicApiKeyAuth                    — loads + validates key, sets req.tenant
 *   4. enforceOriginMatch                  — Origin must equal apiKey.tenantDomain.hostname
 *   5. rateLimitByApiKey                   — per-key sliding window
 *
 * The handlers themselves are reused verbatim from the existing public-*
 * controllers — no duplication. They already read `req.tenant.id` for
 * tenant scoping, so they work unchanged.
 *
 * Mounted in router.config.ts BEFORE the JWT auth chain.
 */

import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import { asyncHandler } from "@/middlewares/errorHandler";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { publicApiKeyAuth } from "@/middlewares/publicApiKeyAuth";
import { enforceOriginMatch } from "@/middlewares/enforceOriginMatch";
import { readOnlyGuard } from "@/middlewares/readOnlyGuard";
import { rateLimitByApiKey } from "@/middlewares/rateLimitByApiKey";

import publicSiteController from "@/modules/public-site/public-site.controller";
import publicBlogController from "@/modules/public-blog/public-blog.controller";
import publicPagesController from "@/modules/public-pages/public-pages.controller";
import bundleController from "@/modules/bundles/bundle.controller";

const router = Router();

// ============================================
// Middleware chain — applied to every /public/v1/* route
// ============================================
router.use(enforceEnvFeature(EnvFeature.PUBLIC_DATA_API));
router.use(readOnlyGuard);
router.use(publicApiKeyAuth());
router.use(enforceOriginMatch);
router.use(rateLimitByApiKey);

// ============================================
// Site / catalog
// ============================================
/**
 * @swagger
 * /public/v1/site:
 *   get:
 *     summary: Get the published site config for the API key's tenant
 *     tags: [PublicDataApi]
 *     security: [{ apiKeyAuth: [] }]
 *     responses: { 200: { description: Site config } }
 */
router.get("/site", asyncHandler(publicSiteController.getSite));

/**
 * @swagger
 * /public/v1/products:
 *   get:
 *     summary: List published products
 *     tags: [PublicDataApi]
 *     security: [{ apiKeyAuth: [] }]
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
 *     responses: { 200: { description: Paginated products } }
 */
router.get("/products", asyncHandler(publicSiteController.listProducts));

/**
 * @swagger
 * /public/v1/products/{id}:
 *   get:
 *     summary: Get a single published product
 *     tags: [PublicDataApi]
 *     security: [{ apiKeyAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses: { 200: { description: Product } }
 */
router.get("/products/:id", asyncHandler(publicSiteController.getProduct));

router.get(
  "/products/:id/reviews",
  asyncHandler(publicSiteController.listProductReviews),
);

router.get(
  "/products/:id/frequently-bought-with",
  asyncHandler(publicSiteController.listFrequentlyBoughtWith),
);

router.get("/categories", asyncHandler(publicSiteController.listCategories));

router.get("/offers", asyncHandler(publicSiteController.listOffers));

router.get(
  "/collections/:slug",
  asyncHandler(publicSiteController.getCollectionBySlug),
);

// ============================================
// Bundles
// ============================================
router.get("/bundles", asyncHandler(bundleController.listPublicBundles));
router.get(
  "/bundles/:slug",
  asyncHandler(bundleController.getPublicBundleBySlug),
);

// ============================================
// Blog
// ============================================
router.get("/blog/posts", asyncHandler(publicBlogController.listPosts));
router.get("/blog/featured", asyncHandler(publicBlogController.listFeatured));
router.get(
  "/blog/categories",
  asyncHandler(publicBlogController.listCategories),
);
router.get(
  "/blog/posts/:slug",
  asyncHandler(publicBlogController.getPostBySlug),
);

// ============================================
// Pages
// ============================================
router.get("/pages", asyncHandler(publicPagesController.listPages));
router.get("/pages/:slug", asyncHandler(publicPagesController.getPageBySlug));

export default router;
