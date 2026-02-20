import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import dashboardController from "./dashboard.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const dashboardRouter = Router();
dashboardRouter.use(verifyToken);

dashboardRouter.get(
  "/user-summary",
  authorizeRoles("user", "admin", "superAdmin"),
  asyncHandler(dashboardController.getUserSummary.bind(dashboardController)),
);

dashboardRouter.get(
  "/admin-summary",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(dashboardController.getAdminSummary.bind(dashboardController)),
);

dashboardRouter.get(
  "/superadmin-summary",
  authorizeRoles("superAdmin"),
  asyncHandler(
    dashboardController.getSuperAdminSummary.bind(dashboardController),
  ),
);

export default dashboardRouter;
