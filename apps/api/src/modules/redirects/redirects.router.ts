/**
 * Redirects Router — tenant-scoped URL redirect rule management.
 * Mounted under /sites/redirects via sites.router.ts.
 */

import { Router } from "express";
import { asyncHandler } from "@/middlewares/errorHandler";
import { requirePermission } from "@/middlewares/requirePermission";
import { workspaceLocator } from "@/shared/permissions/resourceLocator";
import controller from "./redirects.controller";

const router = Router();

const requireUpdate = requirePermission(
  "WEBSITE.SITE.UPDATE",
  workspaceLocator(),
);

/**
 * @swagger
 * /sites/redirects:
 *   get:
 *     summary: List all redirect rules for the tenant
 *     tags: [Sites / Redirects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Redirects list }
 *       403: { description: Insufficient permissions }
 */
router.get("/", requireUpdate, asyncHandler(controller.listRedirects));

/**
 * @swagger
 * /sites/redirects:
 *   post:
 *     summary: Create a new redirect rule
 *     tags: [Sites / Redirects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fromPath, toPath]
 *             properties:
 *               fromPath: { type: string, example: "/old-page" }
 *               toPath:   { type: string, example: "/new-page" }
 *               statusCode: { type: integer, enum: [301, 302], default: 301 }
 *               isActive:   { type: boolean, default: true }
 *     responses:
 *       201: { description: Redirect created }
 *       400: { description: Validation error }
 *       409: { description: Duplicate fromPath or cycle detected }
 *       403: { description: Insufficient permissions }
 */
router.post("/", requireUpdate, asyncHandler(controller.createRedirect));

/**
 * @swagger
 * /sites/redirects/{id}:
 *   get:
 *     summary: Get a single redirect rule
 *     tags: [Sites / Redirects]
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
router.get("/:id", requireUpdate, asyncHandler(controller.getRedirect));

/**
 * @swagger
 * /sites/redirects/{id}:
 *   put:
 *     summary: Update an existing redirect rule
 *     tags: [Sites / Redirects]
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
 *               fromPath:   { type: string }
 *               toPath:     { type: string }
 *               statusCode: { type: integer, enum: [301, 302] }
 *               isActive:   { type: boolean }
 *     responses:
 *       200: { description: Redirect updated }
 *       400: { description: Validation error }
 *       404: { description: Redirect not found }
 *       409: { description: Cycle detected }
 *       403: { description: Insufficient permissions }
 */
router.put("/:id", requireUpdate, asyncHandler(controller.updateRedirect));

/**
 * @swagger
 * /sites/redirects/{id}:
 *   delete:
 *     summary: Delete a redirect rule
 *     tags: [Sites / Redirects]
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
router.delete("/:id", requireUpdate, asyncHandler(controller.deleteRedirect));

export default router;
