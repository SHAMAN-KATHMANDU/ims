import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import errorReportController from "@/modules/error-reports/error-report.controller";

const errorReportRouter = Router();

errorReportRouter.post(
  "/",
  verifyToken,
  authorizeRoles("user", "admin", "superAdmin"),
  errorReportController.create,
);

errorReportRouter.get(
  "/",
  verifyToken,
  authorizeRoles("superAdmin"),
  errorReportController.list,
);

errorReportRouter.patch(
  "/:id",
  verifyToken,
  authorizeRoles("superAdmin"),
  errorReportController.updateStatus,
);

export default errorReportRouter;
