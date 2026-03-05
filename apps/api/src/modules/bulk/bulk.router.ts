import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { enforcePlanFeature } from "@/middlewares/enforcePlanLimits";
import { uploadSingle } from "@/config/multer.config";
import * as bulkController from "./bulk.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const bulkRouter = Router();

/**
 * @swagger
 * /bulk/upload/{type}:
 *   post:
 *     summary: Bulk upload (products, members, or sales)
 *     tags: [Bulk]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema: { type: string, enum: [products, members, sales] }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Upload processed
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
bulkRouter.post(
  "/upload/:type",
  authorizeRoles("admin", "superAdmin"),
  enforcePlanFeature("bulkUpload"),
  uploadSingle,
  asyncHandler(bulkController.bulkUpload),
);

/**
 * GET /bulk/template?type=products|members|sales
 */
bulkRouter.get(
  "/template",
  authorizeRoles("admin", "superAdmin"),
  enforcePlanFeature("bulkUpload"),
  asyncHandler(bulkController.downloadTemplate),
);

/**
 * @swagger
 * /bulk/download:
 *   get:
 *     summary: Download bulk data export
 *     tags: [Bulk]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema: { type: string, enum: [products, members, sales] }
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [excel, csv] }
 *       - in: query
 *         name: ids
 *         schema: { type: string }
 *         description: Comma-separated IDs to export
 *     responses:
 *       200:
 *         description: Export file
 *       401: { description: Unauthorized }
 */
bulkRouter.get(
  "/download",
  authorizeRoles("admin", "user", "superAdmin"),
  asyncHandler(bulkController.download),
);

export default bulkRouter;
