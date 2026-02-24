import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import errorReportController from "@/modules/error-reports/error-report.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const errorReportRouter = Router();

errorReportRouter.post(
  "/",
  authorizeRoles("user", "admin", "superAdmin"),
  asyncHandler(errorReportController.create),
);

errorReportRouter.get(
  "/",
  authorizeRoles("superAdmin"),
  asyncHandler(errorReportController.list),
);

errorReportRouter.patch(
  "/:id",
  authorizeRoles("superAdmin"),
  asyncHandler(errorReportController.updateStatus),
);

export default errorReportRouter;
