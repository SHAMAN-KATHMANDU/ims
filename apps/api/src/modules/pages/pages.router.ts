/**
 * Pages Router — tenant-scoped custom pages (About, FAQ, Shipping, ...).
 * Mounted under /pages; inherits auth + tenant resolution.
 * Role: admin or superAdmin.
 */

import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { asyncHandler } from "@/middlewares/errorHandler";
import controller from "./pages.controller";

const router = Router();

router.use(enforceEnvFeature(EnvFeature.TENANT_WEBSITES));
router.use(authorizeRoles("admin", "superAdmin"));

/**
 * @swagger
 * /pages:
 *   get:
 *     summary: List tenant pages
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 */
router.get("/", asyncHandler(controller.listPages));

/**
 * @swagger
 * /pages:
 *   post:
 *     summary: Create a new tenant page
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 */
router.post("/", asyncHandler(controller.createPage));

/**
 * @swagger
 * /pages/reorder:
 *   post:
 *     summary: Bulk-update nav order for multiple pages
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 */
router.post("/reorder", asyncHandler(controller.reorderPages));

/**
 * @swagger
 * /pages/{id}:
 *   get:
 *     summary: Get one tenant page by id
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 */
router.get("/:id", asyncHandler(controller.getPage));

/**
 * @swagger
 * /pages/{id}:
 *   patch:
 *     summary: Update a tenant page
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 */
router.patch("/:id", asyncHandler(controller.updatePage));

/**
 * @swagger
 * /pages/{id}/publish:
 *   post:
 *     summary: Publish a tenant page
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 */
router.post("/:id/publish", asyncHandler(controller.publishPage));

/**
 * @swagger
 * /pages/{id}/unpublish:
 *   post:
 *     summary: Unpublish a tenant page
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 */
router.post("/:id/unpublish", asyncHandler(controller.unpublishPage));

/**
 * @swagger
 * /pages/{id}:
 *   delete:
 *     summary: Delete a tenant page
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/:id", asyncHandler(controller.deletePage));

export default router;
