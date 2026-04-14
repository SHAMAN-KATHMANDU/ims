/**
 * Blog Router — tenant-scoped blog management.
 * Mounted under /blog; inherits auth + tenant resolution from the main chain.
 * Role: admin or superAdmin.
 */

import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { asyncHandler } from "@/middlewares/errorHandler";
import controller from "./blog.controller";

const router = Router();

router.use(enforceEnvFeature(EnvFeature.TENANT_WEBSITES));
router.use(authorizeRoles("admin", "superAdmin"));

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
router.get("/posts", asyncHandler(controller.listPosts));

/**
 * @swagger
 * /blog/posts:
 *   post:
 *     summary: Create a new blog post (DRAFT status)
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 */
router.post("/posts", asyncHandler(controller.createPost));

/**
 * @swagger
 * /blog/posts/{id}:
 *   get:
 *     summary: Get a single blog post by id
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 */
router.get("/posts/:id", asyncHandler(controller.getPost));

/**
 * @swagger
 * /blog/posts/{id}:
 *   patch:
 *     summary: Update a blog post
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 */
router.patch("/posts/:id", asyncHandler(controller.updatePost));

/**
 * @swagger
 * /blog/posts/{id}/publish:
 *   post:
 *     summary: Publish a blog post
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 */
router.post("/posts/:id/publish", asyncHandler(controller.publishPost));

/**
 * @swagger
 * /blog/posts/{id}/unpublish:
 *   post:
 *     summary: Move a published blog post back to draft
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 */
router.post("/posts/:id/unpublish", asyncHandler(controller.unpublishPost));

/**
 * @swagger
 * /blog/posts/{id}:
 *   delete:
 *     summary: Delete a blog post
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/posts/:id", asyncHandler(controller.deletePost));

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
router.get("/categories", asyncHandler(controller.listCategories));

/**
 * @swagger
 * /blog/categories:
 *   post:
 *     summary: Create a new blog category
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 */
router.post("/categories", asyncHandler(controller.createCategory));

/**
 * @swagger
 * /blog/categories/{id}:
 *   patch:
 *     summary: Update a blog category
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 */
router.patch("/categories/:id", asyncHandler(controller.updateCategory));

/**
 * @swagger
 * /blog/categories/{id}:
 *   delete:
 *     summary: Delete a blog category
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/categories/:id", asyncHandler(controller.deleteCategory));

export default router;
