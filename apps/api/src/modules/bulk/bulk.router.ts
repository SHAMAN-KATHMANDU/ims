import {
  Router,
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";
import { EnvFeature } from "@repo/shared";
import { requirePermission } from "@/middlewares/requirePermission";
import { workspaceLocator } from "@/shared/permissions/resourceLocator";
import { enforcePlanFeature } from "@/middlewares/enforcePlanLimits";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { uploadSingle } from "@/config/multer.config";
import { fail } from "@/shared/response";
import bulkController from "./bulk.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const bulkRouter = Router();

/** Env gate for bulk upload by type: products/members -> BULK_UPLOAD_PRODUCTS, sales -> BULK_UPLOAD_SALES, discounts -> BULK_UPLOAD_PRODUCTS */
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
 * Dynamic permission gate. `bulk/*` routes accept a `:type` (or `?type=`)
 * that selects the target module (products / members / sales / discounts),
 * so the permission key can't be picked at router-mount time — pick it on
 * each request. All four types scope to the tenant WORKSPACE because the
 * bulk operation is inherently collection-level.
 *
 * `action` semantics:
 *   - `upload`: creating many rows at once → module's CREATE (or IMPORT for products)
 *   - `download`: exporting rows → module's EXPORT (or VIEW if no EXPORT bit)
 */
function requireBulkPermission(action: "upload" | "download"): RequestHandler {
  return (req, res, next) => {
    const type = String(req.params.type ?? req.query.type ?? "").toLowerCase();
    const keyByType: Record<string, { upload: string; download: string }> = {
      products: {
        upload: "INVENTORY.PRODUCTS.IMPORT",
        download: "INVENTORY.PRODUCTS.EXPORT",
      },
      // Discounts ride the products bulk-upload path but belong to their own
      // submodule in the catalog.
      discounts: {
        upload: "INVENTORY.DISCOUNTS.CREATE",
        download: "INVENTORY.DISCOUNTS.VIEW",
      },
      sales: {
        upload: "SALES.SALES.CREATE",
        download: "SALES.SALES.EXPORT",
      },
      members: {
        upload: "SETTINGS.MEMBERS.CREATE",
        download: "SETTINGS.MEMBERS.VIEW",
      },
    };
    const key = keyByType[type]?.[action];
    if (!key) {
      return fail(res, `Unknown bulk type: ${type || "(missing)"}`, 400);
    }
    // Delegate to the real middleware; workspaceLocator is correct because
    // bulk actions span every row in the module for this tenant.
    const gate = requirePermission(key, workspaceLocator());
    return gate(req, res, next);
  };
}

/**
 * @swagger
 * /bulk/upload/{type}:
 *   post:
 *     summary: Bulk upload (products, members, sales, discounts)
 *     tags: [Bulk]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema: { type: string, enum: [products, members, sales, discounts] }
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
 *       400: { description: Validation error or unknown type }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — requires module's IMPORT/CREATE permission }
 */
bulkRouter.post(
  "/upload/:type",
  requireBulkPermission("upload"),
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
 *         schema: { type: string, enum: [products, members, sales, discounts] }
 *         description: Entity type for the template
 *     responses:
 *       200:
 *         description: Template file (Excel)
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — requires module's IMPORT/CREATE permission }
 */
bulkRouter.get(
  "/template",
  requireBulkPermission("upload"),
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
 *         schema: { type: string, enum: [products, members, sales, discounts] }
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
 *       403: { description: Forbidden — requires module's EXPORT/VIEW permission }
 */
bulkRouter.get(
  "/download",
  requireBulkPermission("download"),
  asyncHandler(bulkController.download),
);

export default bulkRouter;
