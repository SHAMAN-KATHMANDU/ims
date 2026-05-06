/**
 * Pages Router — tenant-scoped custom pages (About, FAQ, Shipping, ...).
 * Mounted under /pages; inherits auth + tenant resolution.
 * Permissions: WEBSITE.PAGES.* — per-page for mutations, workspace for list.
 */

import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { asyncHandler } from "@/middlewares/errorHandler";
import { requirePermission } from "@/middlewares/requirePermission";
import {
  paramLocator,
  workspaceLocator,
} from "@/shared/permissions/resourceLocator";
import controller from "./pages.controller";
import reviewController from "@/modules/review-workflow/review-workflow.controller";
import authorizeRoles from "@/middlewares/roleMiddleware";

const router = Router();

router.use(enforceEnvFeature(EnvFeature.TENANT_WEBSITES));

const reviewWorkflowGate = enforceEnvFeature(EnvFeature.CMS_REVIEW_WORKFLOW);

/**
 * @swagger
 * /pages:
 *   get:
 *     summary: List tenant pages
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/",
  requirePermission("WEBSITE.PAGES.VIEW", workspaceLocator()),
  asyncHandler(controller.listPages),
);

/**
 * @swagger
 * /pages:
 *   post:
 *     summary: Create a new tenant page
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/",
  requirePermission("WEBSITE.PAGES.CREATE", workspaceLocator()),
  asyncHandler(controller.createPage),
);

/**
 * @swagger
 * /pages/reorder:
 *   post:
 *     summary: Bulk-update nav order for multiple pages
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/reorder",
  requirePermission("WEBSITE.PAGES.UPDATE", workspaceLocator()),
  asyncHandler(controller.reorderPages),
);

/**
 * @swagger
 * /pages/{id}/preview-url:
 *   get:
 *     summary: Mint a short-lived signed preview URL for the page
 *     description: Returns an iframe-ready URL pointing at the tenant-site /preview/page/:id route with an HMAC token. URL expires after 30 minutes.
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: "{ url: string }" }
 *       404: { description: Page not found }
 *       503: { description: No preview target available (no verified domain and no TENANT_SITE_PUBLIC_URL) }
 */
router.get(
  "/:id/preview-url",
  requirePermission("WEBSITE.PAGES.VIEW", paramLocator("PAGE", "id")),
  asyncHandler(controller.getPreviewUrl),
);

/**
 * @swagger
 * /pages/{id}:
 *   get:
 *     summary: Get one tenant page by id
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/:id",
  requirePermission("WEBSITE.PAGES.VIEW", paramLocator("PAGE", "id")),
  asyncHandler(controller.getPage),
);

/**
 * @swagger
 * /pages/{id}:
 *   patch:
 *     summary: Update a tenant page
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  "/:id",
  requirePermission("WEBSITE.PAGES.UPDATE", paramLocator("PAGE", "id")),
  asyncHandler(controller.updatePage),
);

/**
 * @swagger
 * /pages/{id}/publish:
 *   post:
 *     summary: Publish a tenant page
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/:id/publish",
  requirePermission("WEBSITE.PAGES.PUBLISH", paramLocator("PAGE", "id")),
  asyncHandler(controller.publishPage),
);

/**
 * @swagger
 * /pages/{id}/unpublish:
 *   post:
 *     summary: Unpublish a tenant page
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/:id/unpublish",
  requirePermission("WEBSITE.PAGES.PUBLISH", paramLocator("PAGE", "id")),
  asyncHandler(controller.unpublishPage),
);

/**
 * @swagger
 * /pages/{id}/convert-to-blocks:
 *   post:
 *     summary: Convert a markdown TenantPage into a block-based SiteLayout
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/:id/convert-to-blocks",
  requirePermission("WEBSITE.PAGES.UPDATE", paramLocator("PAGE", "id")),
  asyncHandler(controller.convertToBlocks),
);

/**
 * @swagger
 * /pages/{id}/duplicate:
 *   post:
 *     summary: Clone a TenantPage (with auto-bumped slug) and any block layout
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/:id/duplicate",
  requirePermission("WEBSITE.PAGES.CREATE", paramLocator("PAGE", "id")),
  asyncHandler(controller.duplicatePage),
);

/**
 * @swagger
 * /pages/{id}:
 *   delete:
 *     summary: Delete a tenant page
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  "/:id",
  requirePermission("WEBSITE.PAGES.DELETE", paramLocator("PAGE", "id")),
  asyncHandler(controller.deletePage),
);

// ==================== REVIEW WORKFLOW (Phase 6) ====================

router.post(
  "/:id/review/request",
  reviewWorkflowGate,
  requirePermission("WEBSITE.PAGES.UPDATE", paramLocator("PAGE", "id")),
  asyncHandler(reviewController.pageRequestReview),
);

router.post(
  "/:id/review/approve",
  reviewWorkflowGate,
  authorizeRoles("admin", "superAdmin"),
  requirePermission("WEBSITE.PAGES.PUBLISH", paramLocator("PAGE", "id")),
  asyncHandler(reviewController.pageApprove),
);

router.post(
  "/:id/review/reject",
  reviewWorkflowGate,
  authorizeRoles("admin", "superAdmin"),
  requirePermission("WEBSITE.PAGES.PUBLISH", paramLocator("PAGE", "id")),
  asyncHandler(reviewController.pageReject),
);

// ==================== VERSIONS ====================

/**
 * @swagger
 * /pages/{id}/versions:
 *   get:
 *     summary: List version history for a custom page
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/:id/versions",
  requirePermission("WEBSITE.PAGES.VIEW", paramLocator("PAGE", "id")),
  asyncHandler(controller.listVersions),
);

/**
 * @swagger
 * /pages/{id}/versions/{versionId}/restore:
 *   post:
 *     summary: Restore a page to an earlier version
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/:id/versions/:versionId/restore",
  requirePermission("WEBSITE.PAGES.UPDATE", paramLocator("PAGE", "id")),
  asyncHandler(controller.restoreVersion),
);

export default router;
