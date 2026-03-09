import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import dashboardController from "./dashboard.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const dashboardRouter = Router();

/**
 * @swagger
 * /dashboard/user-summary:
 *   get:
 *     summary: Get user dashboard summary
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User summary
 *       401: { description: Unauthorized }
 */
dashboardRouter.get(
  "/user-summary",
  authorizeRoles("user", "admin", "superAdmin"),
  asyncHandler(dashboardController.getUserSummary),
);

/**
 * @swagger
 * /dashboard/admin-summary:
 *   get:
 *     summary: Get admin dashboard summary
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin summary
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
dashboardRouter.get(
  "/admin-summary",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(dashboardController.getAdminSummary),
);

/**
 * @swagger
 * /dashboard/superadmin-summary:
 *   get:
 *     summary: Get superadmin dashboard summary
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Superadmin summary
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
dashboardRouter.get(
  "/superadmin-summary",
  authorizeRoles("superAdmin"),
  asyncHandler(dashboardController.getSuperAdminSummary),
);

export default dashboardRouter;
