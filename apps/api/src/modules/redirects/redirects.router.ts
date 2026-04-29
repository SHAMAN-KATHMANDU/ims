/**
 * Redirects Router — tenant-scoped redirect management.
 * Mounted under /sites/redirects; inherits auth + tenant resolution.
 * Permissions: WEBSITE.SITE.UPDATE required for all operations.
 */

import { Router } from "express";
import { asyncHandler } from "@/middlewares/errorHandler";
import { requirePermission } from "@/middlewares/requirePermission";
import { workspaceLocator } from "@/shared/permissions/resourceLocator";
import controller from "./redirects.controller";

const router = Router();

// All redirect operations require WEBSITE.SITE.UPDATE
const requireUpdate = requirePermission(
  "WEBSITE.SITE.UPDATE",
  workspaceLocator(),
);

/**
 * @swagger
 * /sites/redirects:
 *   get:
 *     summary: List all redirects for the tenant
 *     tags: [Redirects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of redirects
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     redirects:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string }
 *                           tenantId: { type: string }
 *                           fromPath: { type: string }
 *                           toPath: { type: string }
 *                           statusCode: { type: integer, enum: [301, 302] }
 *                           isActive: { type: boolean }
 *                           createdAt: { type: string, format: date-time }
 *                           updatedAt: { type: string, format: date-time }
 *       403: { description: Insufficient permissions }
 */
router.get(
  "/",
  requireUpdate,
  asyncHandler(controller.listRedirects),
);

/**
 * @swagger
 * /sites/redirects:
 *   post:
 *     summary: Create a new redirect
 *     tags: [Redirects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fromPath, toPath, statusCode]
 *             properties:
 *               fromPath: { type: string, description: "Source path (e.g. /old)" }
 *               toPath: { type: string, description: "Destination path" }
 *               statusCode: { type: integer, enum: [301, 302] }
 *               isActive: { type: boolean, default: true }
 *     responses:
 *       201:
 *         description: Redirect created
 *       400: { description: Validation error or identical paths }
 *       409: { description: Redirect cycle detected }
 *       403: { description: Insufficient permissions }
 */
router.post(
  "/",
  requireUpdate,
  asyncHandler(controller.createRedirect),
);

/**
 * @swagger
 * /sites/redirects/{id}:
 *   get:
 *     summary: Get a single redirect
 *     tags: [Redirects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Redirect found }
 *       404: { description: Redirect not found }
 *       403: { description: Insufficient permissions }
 */
router.get(
  "/:id",
  requireUpdate,
  asyncHandler(controller.getRedirect),
);

/**
 * @swagger
 * /sites/redirects/{id}:
 *   put:
 *     summary: Update a redirect
 *     tags: [Redirects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fromPath: { type: string }
 *               toPath: { type: string }
 *               statusCode: { type: integer, enum: [301, 302] }
 *               isActive: { type: boolean }
 *     responses:
 *       200: { description: Redirect updated }
 *       400: { description: Validation error }
 *       404: { description: Redirect not found }
 *       409: { description: Redirect cycle detected }
 *       403: { description: Insufficient permissions }
 */
router.put(
  "/:id",
  requireUpdate,
  asyncHandler(controller.updateRedirect),
);

/**
 * @swagger
 * /sites/redirects/{id}:
 *   delete:
 *     summary: Delete a redirect
 *     tags: [Redirects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Redirect deleted }
 *       404: { description: Redirect not found }
 *       403: { description: Insufficient permissions }
 */
router.delete(
  "/:id",
  requireUpdate,
  asyncHandler(controller.deleteRedirect),
);

export default router;
