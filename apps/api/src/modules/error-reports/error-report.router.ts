import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import errorReportController from "@/modules/error-reports/error-report.controller";
import { asyncHandler } from "@/middlewares/errorHandler";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/middlewares/validateRequest";
import {
  createErrorReportSchema,
  errorReportIdParamsSchema,
  errorReportsListQuerySchema,
  updateErrorReportStatusSchema,
} from "./error-report.schema";

const errorReportRouter = Router();

errorReportRouter.post(
  "/",
  verifyToken,
  authorizeRoles("user", "admin", "superAdmin"),
  validateBody(createErrorReportSchema),
  asyncHandler(errorReportController.create),
);

errorReportRouter.get(
  "/",
  verifyToken,
  authorizeRoles("superAdmin"),
  validateQuery(errorReportsListQuerySchema),
  asyncHandler(errorReportController.list),
);

errorReportRouter.patch(
  "/:id",
  verifyToken,
  authorizeRoles("superAdmin"),
  validateParams(errorReportIdParamsSchema),
  validateBody(updateErrorReportStatusSchema),
  asyncHandler(errorReportController.updateStatus),
);

export default errorReportRouter;
