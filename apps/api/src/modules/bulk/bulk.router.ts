import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { enforcePlanFeature } from "@/middlewares/enforcePlanLimits";
import { uploadSingle } from "@/config/multer.config";
import * as bulkController from "./bulk.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const bulkRouter = Router();

/**
 * POST /bulk/upload/:type
 * type = products|members|sales; body (multipart): file only
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
 * GET /bulk/download?type=products|members|sales&format=excel|csv&ids=...
 */
bulkRouter.get(
  "/download",
  authorizeRoles("admin", "user", "superAdmin"),
  asyncHandler(bulkController.download),
);

export default bulkRouter;
