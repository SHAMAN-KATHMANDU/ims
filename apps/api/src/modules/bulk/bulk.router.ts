import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { uploadSingle } from "@/config/multer.config";
import * as bulkController from "./bulk.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const bulkRouter = Router();

bulkRouter.use(verifyToken);

/**
 * POST /bulk/upload/:type
 * type = products|members|sales; body (multipart): file only
 */
bulkRouter.post(
  "/upload/:type",
  authorizeRoles("admin", "superAdmin"),
  uploadSingle,
  asyncHandler(bulkController.bulkUpload),
);

/**
 * GET /bulk/template?type=products|members|sales
 */
bulkRouter.get(
  "/template",
  authorizeRoles("admin", "superAdmin"),
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
