/**
 * Site Layouts Router — tenant-scoped block layouts.
 * Mounted under /site-layouts; inherits auth + tenant resolution.
 * Permissions: WEBSITE.SITE.* — VIEW/UPDATE/DEPLOY for publish.
 *
 * IMPORTANT: /preview/refresh and /preview/invalidate are registered BEFORE
 * /:scope so Express does not match "refresh"/"invalidate" as scope params.
 */

import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { asyncHandler } from "@/middlewares/errorHandler";
import { requirePermission } from "@/middlewares/requirePermission";
import { workspaceLocator } from "@/shared/permissions/resourceLocator";
import controller from "./site-layouts.controller";

const router = Router();

router.use(enforceEnvFeature(EnvFeature.TENANT_WEBSITES));
router.use(requirePermission("WEBSITE.SITE.VIEW", workspaceLocator()));

const requireUpdate = requirePermission(
  "WEBSITE.SITE.UPDATE",
  workspaceLocator(),
);
const requireDeploy = requirePermission(
  "WEBSITE.SITE.DEPLOY",
  workspaceLocator(),
);

/**
 * @swagger
 * /site-layouts/preview/refresh:
 *   post:
 *     summary: Refresh an existing preview token (extends TTL by 30 minutes)
 *     description: |
 *       Verifies the current HMAC-signed token and its Redis nonce, then issues a
 *       new token for the same scope/pageId with a fresh 30-minute TTL. Called by
 *       the editor on each successful save (refresh-on-activity). The old nonce
 *       remains valid until its natural Redis TTL to avoid race conditions with
 *       in-flight preview requests.
 *     tags: [SiteLayouts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *                 description: Current preview token embedded in the iframe URL
 *     responses:
 *       200:
 *         description: New preview URL with refreshed token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 url: { type: string }
 *       400:
 *         description: Missing token
 *       401:
 *         description: Token expired or Redis nonce missing (revoked)
 *       403:
 *         description: Token belongs to a different tenant
 */
router.post(
  "/preview/refresh",
  requireUpdate,
  asyncHandler(controller.refreshPreviewToken),
);

/**
 * @swagger
 * /site-layouts/preview/invalidate:
 *   post:
 *     summary: Invalidate a preview token (revoke its Redis nonce)
 *     description: |
 *       Immediately revokes the Redis nonce for the given token so the public
 *       preview endpoint rejects it on the next request. Accepts expired tokens
 *       so the editor can clean up after a long session (exp check skipped).
 *       Called on editor close and user sign-out. Best-effort — errors do not
 *       propagate to the client.
 *     tags: [SiteLayouts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token invalidated (or silently ignored if malformed)
 *       400:
 *         description: Missing token
 *       403:
 *         description: Token belongs to a different tenant
 */
router.post(
  "/preview/invalidate",
  requireUpdate,
  asyncHandler(controller.invalidatePreviewToken),
);

/**
 * @swagger
 * /site-layouts:
 *   get:
 *     summary: List site layouts for the current tenant
 *     tags: [SiteLayouts]
 *     security:
 *       - bearerAuth: []
 */
router.get("/", asyncHandler(controller.list));

/**
 * @swagger
 * /site-layouts:
 *   put:
 *     summary: Upsert (save draft) a block layout for a scope
 *     tags: [SiteLayouts]
 *     security:
 *       - bearerAuth: []
 */
router.put("/", requireUpdate, asyncHandler(controller.upsert));

/**
 * @swagger
 * /site-layouts/{scope}:
 *   get:
 *     summary: Get one layout by scope (optional pageId query for page scope)
 *     tags: [SiteLayouts]
 *     security:
 *       - bearerAuth: []
 */
router.get("/:scope", asyncHandler(controller.get));

/**
 * @swagger
 * /site-layouts/{scope}/publish:
 *   post:
 *     summary: Promote the draft block tree to published
 *     tags: [SiteLayouts]
 *     security:
 *       - bearerAuth: []
 */
router.post("/:scope/publish", requireDeploy, asyncHandler(controller.publish));

/**
 * @swagger
 * /site-layouts/{scope}/preview-url:
 *   get:
 *     summary: Mint a signed preview URL for the current scope's draft tree
 *     tags: [SiteLayouts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pageId
 *         schema: { type: string, format: uuid }
 */
router.get("/:scope/preview-url", asyncHandler(controller.getPreviewUrl));

/**
 * @swagger
 * /site-layouts/{scope}/reset-from-template:
 *   post:
 *     summary: Replace the draft block tree with the template blueprint
 *     tags: [SiteLayouts]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/:scope/reset-from-template",
  requireUpdate,
  asyncHandler(controller.resetFromTemplate),
);

/**
 * @swagger
 * /site-layouts/{scope}:
 *   delete:
 *     summary: Delete a layout for a scope (optional pageId query for page scope)
 *     tags: [SiteLayouts]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/:scope", requireUpdate, asyncHandler(controller.remove));

export default router;
