import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import errorReportController from "@/modules/error-reports/error-report.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const errorReportRouter = Router();

errorReportRouter.post(
  "/",
  verifyToken,
  authorizeRoles("user", "admin", "superAdmin"),
  asyncHandler(errorReportController.create),
);

errorReportRouter.get(
  "/",
  verifyToken,
  authorizeRoles("superAdmin"),
  asyncHandler(errorReportController.list),
);

errorReportRouter.patch(
  "/:id",
  verifyToken,
  authorizeRoles("superAdmin"),
  asyncHandler(errorReportController.updateStatus),
);

export default errorReportRouter;
