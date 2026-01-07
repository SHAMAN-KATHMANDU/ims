import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import analyticsController from "@/modules/analytics/analytics.controller";

const analyticsRouter = Router();

// Get analytics (admin and superAdmin only)
analyticsRouter.get(
  '/',
  verifyToken,
  authorizeRoles("admin", "superAdmin"),
  analyticsController.getAnalytics
);

export default analyticsRouter;

