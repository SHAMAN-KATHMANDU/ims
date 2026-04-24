/**
 * Sites Router — tenant-scoped website management.
 * Mounted under /sites; inherits auth + tenant resolution from the main chain.
 * Permissions: WEBSITE.SITE.* — VIEW gate on read routes, UPDATE on mutations,
 *              DEPLOY on publish/unpublish (dangerous).
 */

import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { asyncHandler } from "@/middlewares/errorHandler";
import { requirePermission } from "@/middlewares/requirePermission";
import { workspaceLocator } from "@/shared/permissions/resourceLocator";
import controller from "./sites.controller";

const router = Router();

router.use(enforceEnvFeature(EnvFeature.TENANT_WEBSITES));
// Baseline VIEW gate covers GET routes; write routes stack a stricter gate.
router.use(requirePermission("WEBSITE.SITE.VIEW", workspaceLocator()));

// Pre-bound gates to keep per-route lines terse.
const requireUpdate = requirePermission(
  "WEBSITE.SITE.UPDATE",
  workspaceLocator(),
);
const requireDeploy = requirePermission(
  "WEBSITE.SITE.DEPLOY",
  workspaceLocator(),
);
const requirePageView = requirePermission(
  "WEBSITE.PAGES.VIEW",
  workspaceLocator(),
);
const requirePageCreate = requirePermission(
  "WEBSITE.PAGES.CREATE",
  workspaceLocator(),
);
const requirePageUpdate = requirePermission(
  "WEBSITE.PAGES.UPDATE",
  workspaceLocator(),
);
const requirePageDelete = requirePermission(
  "WEBSITE.PAGES.DELETE",
  workspaceLocator(),
);

/**
 * @swagger
 * /sites/config:
 *   get:
 *     summary: Get the current tenant's site config
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Site config }
 *       403: { description: Website feature not enabled for this tenant }
 */
router.get("/config", asyncHandler(controller.getConfig));

/**
 * @swagger
 * /sites/config:
 *   put:
 *     summary: Update the current tenant's site config (branding, contact, features, seo)
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               branding: { type: object, nullable: true }
 *               contact:  { type: object, nullable: true }
 *               features: { type: object, nullable: true }
 *               seo:      { type: object, nullable: true }
 *     responses:
 *       200: { description: Site config updated }
 *       400: { description: Validation error }
 *       403: { description: Website feature not enabled }
 */
router.put("/config", requireUpdate, asyncHandler(controller.updateConfig));

/**
 * @swagger
 * /sites/templates:
 *   get:
 *     summary: List available website templates
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Templates list }
 *       403: { description: Website feature not enabled }
 */
router.get("/templates", asyncHandler(controller.listTemplates));

/**
 * @swagger
 * /sites/template:
 *   post:
 *     summary: Pick or switch the template for the current tenant
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [templateSlug]
 *             properties:
 *               templateSlug:  { type: string, example: luxury }
 *               resetBranding: { type: boolean, default: false }
 *     responses:
 *       200: { description: Template applied }
 *       400: { description: Validation or inactive template }
 *       403: { description: Website feature not enabled }
 *       404: { description: Template not found }
 */
router.post("/template", requireUpdate, asyncHandler(controller.pickTemplate));

/**
 * @swagger
 * /sites/publish:
 *   post:
 *     summary: Publish the current tenant's site (requires a picked template)
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Site published }
 *       400: { description: No template picked yet }
 *       403: { description: Website feature not enabled }
 */
router.post("/publish", requireDeploy, asyncHandler(controller.publish));

/**
 * @swagger
 * /sites/unpublish:
 *   post:
 *     summary: Unpublish the current tenant's site
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Site unpublished }
 *       403: { description: Website feature not enabled }
 */
router.post("/unpublish", requireDeploy, asyncHandler(controller.unpublish));

/**
 * @swagger
 * /sites/pages:
 *   get:
 *     summary: List all custom pages for the current tenant's site
 *     tags: [Sites / Pages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Pages list }
 *       403: { description: Website feature not enabled }
 */
router.get("/pages", requirePageView, asyncHandler(controller.listPages));

/**
 * @swagger
 * /sites/pages:
 *   post:
 *     summary: Create a new custom page for the current tenant's site
 *     tags: [Sites / Pages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, slug, scope]
 *             properties:
 *               title: { type: string, minLength: 1, maxLength: 200, example: "Custom Page" }
 *               slug: { type: string, minLength: 1, maxLength: 200, example: "custom-page" }
 *               scope: { type: string, enum: [home, products-index, product-detail, custom] }
 *               seo:
 *                 type: object
 *                 properties:
 *                   title: { type: string, maxLength: 200 }
 *                   description: { type: string, maxLength: 500 }
 *                   ogImage: { type: string, maxLength: 1000 }
 *                   noindex: { type: boolean }
 *     responses:
 *       201: { description: Page created }
 *       400: { description: Validation error }
 *       403: { description: Website feature not enabled }
 */
router.post("/pages", requirePageCreate, asyncHandler(controller.createPage));

/**
 * @swagger
 * /sites/pages/{pageId}:
 *   get:
 *     summary: Get a specific page by ID
 *     tags: [Sites / Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Page details }
 *       403: { description: Website feature not enabled }
 *       404: { description: Page not found }
 */
router.get("/pages/:pageId", requirePageView, asyncHandler(controller.getPage));

/**
 * @swagger
 * /sites/pages/{pageId}:
 *   put:
 *     summary: Update a custom page's metadata
 *     tags: [Sites / Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string, minLength: 1, maxLength: 200 }
 *               slug: { type: string, minLength: 1, maxLength: 200 }
 *               seo:
 *                 type: object
 *                 properties:
 *                   title: { type: string, maxLength: 200 }
 *                   description: { type: string, maxLength: 500 }
 *                   ogImage: { type: string, maxLength: 1000 }
 *                   noindex: { type: boolean }
 *     responses:
 *       200: { description: Page updated }
 *       400: { description: Validation error }
 *       403: { description: Website feature not enabled }
 *       404: { description: Page not found }
 */
router.put(
  "/pages/:pageId",
  requirePageUpdate,
  asyncHandler(controller.updatePage),
);

/**
 * @swagger
 * /sites/pages/{pageId}:
 *   delete:
 *     summary: Delete a custom page
 *     tags: [Sites / Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Page deleted }
 *       403: { description: Website feature not enabled }
 *       404: { description: Page not found }
 */
router.delete(
  "/pages/:pageId",
  requirePageDelete,
  asyncHandler(controller.deletePage),
);

/**
 * @swagger
 * /sites/blocks/{scope}:
 *   post:
 *     summary: Upsert the complete block tree for a scope (homepage, product index, etc.)
 *     tags: [Sites / Blocks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scope
 *         required: true
 *         schema: { type: string, enum: [home, products-index, product-detail, header, footer] }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [blocks]
 *             properties:
 *               pageId: { type: string, nullable: true }
 *               blocks:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [id, kind]
 *                   properties:
 *                     id: { type: string }
 *                     kind: { type: string, example: "TextBlock" }
 *                     props: { type: object }
 *                     style: { type: object }
 *                     visibility: { type: object }
 *     responses:
 *       200: { description: Blocks upserted (draft) }
 *       400: { description: Validation error }
 *       403: { description: Website feature not enabled }
 */
router.post(
  "/blocks/:scope",
  requireUpdate,
  asyncHandler(controller.upsertBlocks),
);

/**
 * @swagger
 * /sites/blocks/{scope}/reorder:
 *   post:
 *     summary: Reorder blocks in a scope by providing new block IDs in order
 *     tags: [Sites / Blocks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scope
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: pageId
 *         schema: { type: string }
 *         description: Optional page ID for custom pages
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [blockIds]
 *             properties:
 *               blockIds:
 *                 type: array
 *                 items: { type: string }
 *                 minItems: 1
 *                 example: ["block-1", "block-2", "block-3"]
 *     responses:
 *       200: { description: Blocks reordered in draft }
 *       400: { description: Validation error }
 *       403: { description: Website feature not enabled }
 */
router.post(
  "/blocks/:scope/reorder",
  requireUpdate,
  asyncHandler(controller.reorderBlocks),
);

/**
 * @swagger
 * /sites/blocks/{scope}/add:
 *   post:
 *     summary: Add a single block to the end of a scope's block tree
 *     tags: [Sites / Blocks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scope
 *         required: true
 *         schema: { type: string, enum: [home, products-index, product-detail, header, footer] }
 *       - in: query
 *         name: pageId
 *         schema: { type: string }
 *         description: Optional page ID for custom pages
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [block]
 *             properties:
 *               block:
 *                 type: object
 *                 required: [id, kind]
 *                 properties:
 *                   id: { type: string }
 *                   kind: { type: string, example: "TextBlock" }
 *                   props: { type: object }
 *                   style: { type: object }
 *                   visibility: { type: object }
 *     responses:
 *       201: { description: Block added to draft }
 *       400: { description: Validation error }
 *       403: { description: Website feature not enabled }
 */
router.post(
  "/blocks/:scope/add",
  requireUpdate,
  asyncHandler(controller.addBlock),
);

/**
 * @swagger
 * /sites/blocks/{scope}/{blockId}:
 *   put:
 *     summary: Update a specific block's props, style, or visibility
 *     tags: [Sites / Blocks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scope
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: blockId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: pageId
 *         schema: { type: string }
 *         description: Optional page ID for custom pages
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               props: { type: object, description: "Block-specific props" }
 *               style: { type: object, nullable: true, description: "Visual overrides (padding, margin, colors, etc.)" }
 *               visibility:
 *                 type: object
 *                 properties:
 *                   desktop: { type: boolean }
 *                   tablet: { type: boolean }
 *                   mobile: { type: boolean }
 *     responses:
 *       200: { description: Block updated in draft }
 *       400: { description: Validation error }
 *       403: { description: Website feature not enabled }
 *       404: { description: Block not found }
 */
router.put(
  "/blocks/:scope/:blockId",
  requireUpdate,
  asyncHandler(controller.updateBlock),
);

/**
 * @swagger
 * /sites/blocks/{scope}/{blockId}:
 *   delete:
 *     summary: Delete a block from the scope's block tree
 *     tags: [Sites / Blocks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scope
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: blockId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: pageId
 *         schema: { type: string }
 *         description: Optional page ID for custom pages
 *     responses:
 *       200: { description: Block deleted from draft }
 *       403: { description: Website feature not enabled }
 *       404: { description: Block not found }
 */
router.delete(
  "/blocks/:scope/:blockId",
  requireUpdate,
  asyncHandler(controller.deleteBlock),
);

/**
 * @swagger
 * /sites/globals:
 *   get:
 *     summary: Get the site's global blocks (header and footer)
 *     tags: [Sites / Globals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Header and footer block trees }
 *       403: { description: Website feature not enabled }
 */
router.get("/globals", asyncHandler(controller.getGlobals));

/**
 * @swagger
 * /sites/globals:
 *   put:
 *     summary: Update the site's global blocks (header and/or footer)
 *     tags: [Sites / Globals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               header:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [id, kind]
 *                   properties:
 *                     id: { type: string }
 *                     kind: { type: string }
 *                     props: { type: object }
 *                     style: { type: object }
 *                     visibility: { type: object }
 *               footer:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [id, kind]
 *                   properties:
 *                     id: { type: string }
 *                     kind: { type: string }
 *                     props: { type: object }
 *                     style: { type: object }
 *                     visibility: { type: object }
 *     responses:
 *       200: { description: Globals updated }
 *       400: { description: Validation error }
 *       403: { description: Website feature not enabled }
 */
router.put("/globals", requireUpdate, asyncHandler(controller.updateGlobals));

/**
 * @swagger
 * /sites/theme:
 *   get:
 *     summary: Get the site's theme tokens (colors, typography, layout)
 *     tags: [Sites / Theme]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Theme tokens object }
 *       403: { description: Website feature not enabled }
 */
router.get("/theme", asyncHandler(controller.getTheme));

/**
 * @swagger
 * /sites/theme:
 *   put:
 *     summary: Update the site's theme tokens (colors, typography, layout)
 *     tags: [Sites / Theme]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               colors:
 *                 type: object
 *                 properties:
 *                   primary: { type: string, example: "#000000" }
 *                   accent: { type: string }
 *                   secondary: { type: string }
 *                   background: { type: string }
 *                   surface: { type: string }
 *                   text: { type: string }
 *                   muted: { type: string }
 *                   border: { type: string }
 *               typography:
 *                 type: object
 *                 properties:
 *                   headingFont: { type: string, example: "Inter" }
 *                   bodyFont: { type: string }
 *                   baseSize: { type: integer, minimum: 10, maximum: 32 }
 *                   typeScale: { type: number, minimum: 1, maximum: 2 }
 *               layout:
 *                 type: object
 *                 properties:
 *                   containerWidth: { type: integer, minimum: 300, maximum: 2000 }
 *                   sectionPadding: { type: string }
 *                   radiusPx: { type: integer, minimum: 0, maximum: 50 }
 *                   buttonStyle: { type: string, enum: [solid, outline, pill] }
 *     responses:
 *       200: { description: Theme updated }
 *       400: { description: Validation error }
 *       403: { description: Website feature not enabled }
 */
router.put("/theme", requireUpdate, asyncHandler(controller.updateTheme));

/**
 * @swagger
 * /sites/seo:
 *   get:
 *     summary: Get the site's SEO settings (title, description, GA ID, robots)
 *     tags: [Sites / SEO]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: SEO settings object }
 *       403: { description: Website feature not enabled }
 */
router.get("/seo", asyncHandler(controller.getSeo));

/**
 * @swagger
 * /sites/seo:
 *   put:
 *     summary: Update the site's SEO settings
 *     tags: [Sites / SEO]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               siteTitle: { type: string, maxLength: 200, example: "My Store" }
 *               siteDescription: { type: string, maxLength: 500 }
 *               gaId: { type: string, maxLength: 100, example: "G-XXXXXXXXXX" }
 *               robots: { type: string, maxLength: 1000, example: "index, follow" }
 *     responses:
 *       200: { description: SEO settings updated }
 *       400: { description: Validation error }
 *       403: { description: Website feature not enabled }
 */
router.put("/seo", requireUpdate, asyncHandler(controller.updateSeo));

export default router;
