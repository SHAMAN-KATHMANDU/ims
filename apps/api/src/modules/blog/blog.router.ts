/**
 * Blog Router — tenant-scoped blog management.
 * Mounted under /blog; inherits auth + tenant resolution from the main chain.
 * Permissions: WEBSITE.BLOG.* — scoped per post (or workspace for listing).
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
import controller from "./blog.controller";
import reviewController from "@/modules/review-workflow/review-workflow.controller";
import authorizeRoles from "@/middlewares/roleMiddleware";

const router = Router();

// Phase 6: review-workflow gate. The whole workflow lives behind this
// flag — when off, request-review/approve/reject endpoints 404 below.
const reviewWorkflowGate = enforceEnvFeature(EnvFeature.CMS_REVIEW_WORKFLOW);

router.use(enforceEnvFeature(EnvFeature.TENANT_WEBSITES));

// ==================== POSTS ====================

/**
 * @swagger
 * /blog/posts:
 *   get:
 *     summary: List blog posts for the current tenant
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/posts",
  requirePermission("WEBSITE.BLOG.VIEW", workspaceLocator()),
  asyncHandler(controller.listPosts),
);

/**
 * @swagger
 * /blog/posts:
 *   post:
 *     summary: Create a new blog post (DRAFT status)
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/posts",
  requirePermission("WEBSITE.BLOG.CREATE", workspaceLocator()),
  asyncHandler(controller.createPost),
);

/**
 * @swagger
 * /blog/posts/{id}:
 *   get:
 *     summary: Get a single blog post by id
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/posts/:id",
  requirePermission("WEBSITE.BLOG.VIEW", paramLocator("BLOG_POST", "id")),
  asyncHandler(controller.getPost),
);

/**
 * @swagger
 * /blog/posts/{id}:
 *   patch:
 *     summary: Update a blog post
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  "/posts/:id",
  requirePermission("WEBSITE.BLOG.UPDATE", paramLocator("BLOG_POST", "id")),
  asyncHandler(controller.updatePost),
);

/**
 * @swagger
 * /blog/posts/{id}/publish:
 *   post:
 *     summary: Publish a blog post
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/posts/:id/publish",
  requirePermission("WEBSITE.BLOG.PUBLISH", paramLocator("BLOG_POST", "id")),
  asyncHandler(controller.publishPost),
);

/**
 * @swagger
 * /blog/posts/{id}/unpublish:
 *   post:
 *     summary: Move a published blog post back to draft
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/posts/:id/unpublish",
  requirePermission("WEBSITE.BLOG.PUBLISH", paramLocator("BLOG_POST", "id")),
  asyncHandler(controller.unpublishPost),
);

/**
 * @swagger
 * /blog/posts/{id}:
 *   delete:
 *     summary: Delete a blog post
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  "/posts/:id",
  requirePermission("WEBSITE.BLOG.DELETE", paramLocator("BLOG_POST", "id")),
  asyncHandler(controller.deletePost),
);

// ==================== REVIEW WORKFLOW (Phase 6) ====================

/**
 * @swagger
 * /blog/posts/{id}/review/request:
 *   post:
 *     summary: Move a draft post into review (Phase 6 — flagged)
 *     tags: [Blog]
 */
router.post(
  "/posts/:id/review/request",
  reviewWorkflowGate,
  requirePermission("WEBSITE.BLOG.UPDATE", paramLocator("BLOG_POST", "id")),
  asyncHandler(reviewController.blogRequestReview),
);

/**
 * @swagger
 * /blog/posts/{id}/review/approve:
 *   post:
 *     summary: Approve a post in review (admin / superAdmin only)
 *     tags: [Blog]
 */
router.post(
  "/posts/:id/review/approve",
  reviewWorkflowGate,
  authorizeRoles("admin", "superAdmin"),
  requirePermission("WEBSITE.BLOG.PUBLISH", paramLocator("BLOG_POST", "id")),
  asyncHandler(reviewController.blogApprove),
);

/**
 * @swagger
 * /blog/posts/{id}/review/reject:
 *   post:
 *     summary: Reject a post (admin / superAdmin only) — moves it back to DRAFT
 *     tags: [Blog]
 */
router.post(
  "/posts/:id/review/reject",
  reviewWorkflowGate,
  authorizeRoles("admin", "superAdmin"),
  requirePermission("WEBSITE.BLOG.PUBLISH", paramLocator("BLOG_POST", "id")),
  asyncHandler(reviewController.blogReject),
);

// ==================== VERSIONS ====================

/**
 * @swagger
 * /blog/posts/{id}/versions:
 *   get:
 *     summary: List version history for a blog post
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/posts/:id/versions",
  requirePermission("WEBSITE.BLOG.VIEW", paramLocator("BLOG_POST", "id")),
  asyncHandler(controller.listVersions),
);

/**
 * @swagger
 * /blog/posts/{id}/versions/{versionId}/restore:
 *   post:
 *     summary: Restore a blog post to an earlier version
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/posts/:id/versions/:versionId/restore",
  requirePermission("WEBSITE.BLOG.UPDATE", paramLocator("BLOG_POST", "id")),
  asyncHandler(controller.restoreVersion),
);

// ==================== CATEGORIES ====================

/**
 * @swagger
 * /blog/categories:
 *   get:
 *     summary: List blog categories for the current tenant
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/categories",
  requirePermission("WEBSITE.BLOG.VIEW", workspaceLocator()),
  asyncHandler(controller.listCategories),
);

/**
 * @swagger
 * /blog/categories:
 *   post:
 *     summary: Create a new blog category
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/categories",
  requirePermission("WEBSITE.BLOG.CREATE", workspaceLocator()),
  asyncHandler(controller.createCategory),
);

/**
 * @swagger
 * /blog/categories/{id}:
 *   patch:
 *     summary: Update a blog category
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  "/categories/:id",
  requirePermission("WEBSITE.BLOG.UPDATE", workspaceLocator()),
  asyncHandler(controller.updateCategory),
);

/**
 * @swagger
 * /blog/categories/{id}:
 *   delete:
 *     summary: Delete a blog category
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  "/categories/:id",
  requirePermission("WEBSITE.BLOG.DELETE", workspaceLocator()),
  asyncHandler(controller.deleteCategory),
);

export default router;
