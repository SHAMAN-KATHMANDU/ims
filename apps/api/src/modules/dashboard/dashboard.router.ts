import { Router } from "express";
import { requirePermission } from "@/middlewares/requirePermission";
import { workspaceLocator } from "@/shared/permissions/resourceLocator";
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
  requirePermission("REPORTS.DASHBOARDS.VIEW", workspaceLocator()),
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
  requirePermission("REPORTS.DASHBOARDS.VIEW", workspaceLocator()),
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
  requirePermission("REPORTS.DASHBOARDS.VIEW", workspaceLocator()),
  asyncHandler(dashboardController.getSuperAdminSummary),
);

/**
 * @swagger
 * /dashboard/usage:
 *   get:
 *     summary: Get tenant resource usage and plan limits
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usage counts and limits for users, locations, products
 *       401: { description: Unauthorized }
 *       404: { description: Tenant context not available }
 */
dashboardRouter.get(
  "/usage",
  requirePermission("SETTINGS.TENANT.VIEW", workspaceLocator()),
  asyncHandler(dashboardController.getTenantUsage),
);

export default dashboardRouter;
