import { Router } from "express";
import { requirePermission } from "@/middlewares/requirePermission";
import {
  paramLocator,
  workspaceLocator,
} from "@/shared/permissions/resourceLocator";
import errorReportController from "@/modules/error-reports/error-report.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const errorReportRouter = Router();

/**
 * @swagger
 * /error-reports:
 *   post:
 *     summary: Submit a client-side error report
 *     tags: [ErrorReports]
 *     security:
 *       - bearerAuth: []
 */
// NOTE: `create` is self-service — any authenticated user can file an error
// report against their own tenant workspace. The VIEW gate covers it.
errorReportRouter.post(
  "/",
  requirePermission("SETTINGS.ERROR_REPORTS.VIEW", workspaceLocator()),
  asyncHandler(errorReportController.create),
);

/**
 * @swagger
 * /error-reports:
 *   get:
 *     summary: List error reports
 *     tags: [ErrorReports]
 *     security:
 *       - bearerAuth: []
 */
errorReportRouter.get(
  "/",
  requirePermission("SETTINGS.ERROR_REPORTS.VIEW", workspaceLocator()),
  asyncHandler(errorReportController.list),
);

/**
 * @swagger
 * /error-reports/{id}:
 *   patch:
 *     summary: Update error report status
 *     tags: [ErrorReports]
 *     security:
 *       - bearerAuth: []
 */
errorReportRouter.patch(
  "/:id",
  requirePermission(
    "SETTINGS.ERROR_REPORTS.VIEW",
    paramLocator("AUDIT_LOG", "id"),
  ),
  asyncHandler(errorReportController.updateStatus),
);

export default errorReportRouter;
