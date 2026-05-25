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
 *     summary: Get the authenticated user's personal dashboard summary
 *     description: |
 *       Returns sales, revenue, credit and trend data for the authenticated
 *       user (resolved from the JWT). Auth-only — no RBAC permission gate.
 *       The data set is intrinsically personal: `getUserSummary(userId)` uses
 *       the JWT userId verbatim and every underlying query is scoped to that
 *       userId, so there is nothing for a permission check to isolate.
 *
 *       Adding `REPORTS.DASHBOARD.PERSONAL_VIEW` here previously produced
 *       "Forbidden" toasts on the user dashboard for any legacy `user` whose
 *       RBAC seed had not yet linked them to the STAFF role (issue #530 —
 *       same seed-drift family as #486 / #488 / #535 / #538-#540).
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
