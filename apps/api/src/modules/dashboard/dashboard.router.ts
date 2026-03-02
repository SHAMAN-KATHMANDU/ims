import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import dashboardController from "./dashboard.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const dashboardRouter = Router();

dashboardRouter.get(
  "/user-summary",
  authorizeRoles("user", "admin", "superAdmin"),
  asyncHandler(dashboardController.getUserSummary),
);

dashboardRouter.get(
  "/admin-summary",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(dashboardController.getAdminSummary),
);

dashboardRouter.get(
  "/superadmin-summary",
  authorizeRoles("superAdmin"),
  asyncHandler(dashboardController.getSuperAdminSummary),
);

export default dashboardRouter;
