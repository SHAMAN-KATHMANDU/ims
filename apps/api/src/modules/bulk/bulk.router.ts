import { Router, Request, Response, NextFunction } from "express";
import { EnvFeature } from "@repo/shared";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { enforcePlanFeature } from "@/middlewares/enforcePlanLimits";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { uploadSingle } from "@/config/multer.config";
import bulkController from "./bulk.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const bulkRouter = Router();

/** Env gate for bulk upload by type: products/members -> BULK_UPLOAD_PRODUCTS, sales -> BULK_UPLOAD_SALES */
function enforceBulkUploadEnv(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const type = (req.params.type ?? req.query.type) as string;
  const flag =
    type === "sales"
      ? EnvFeature.BULK_UPLOAD_SALES
      : EnvFeature.BULK_UPLOAD_PRODUCTS;
  const mw = enforceEnvFeature(flag);
  mw(req, res, next);
}

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
  enforceBulkUploadEnv,
  uploadSingle,
  asyncHandler(bulkController.bulkUpload),
);

/**
 * @swagger
 * /bulk/template:
 *   get:
 *     summary: Download bulk upload template
 *     tags: [Bulk]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema: { type: string, enum: [products, members, sales] }
 *         description: Entity type for the template
 *     responses:
 *       200:
 *         description: Template file (Excel)
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
bulkRouter.get(
  "/template",
  authorizeRoles("admin", "superAdmin"),
  enforcePlanFeature("bulkUpload"),
  enforceBulkUploadEnv,
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
 *         description: Export format (excel/xlsx or csv)
 *       - in: query
 *         name: ids
 *         schema: { type: string }
 *         description: Comma-separated IDs to export. Omit to export all.
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
