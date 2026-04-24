import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import { requirePermission } from "@/middlewares/requirePermission";
import { workspaceLocator } from "@/shared/permissions/resourceLocator";
import { enforcePlanFeature } from "@/middlewares/enforcePlanLimits";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import auditController from "@/modules/audit/audit.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const auditRouter = Router();

/**
 * @swagger
 * /audit-logs:
 *   get:
 *     summary: Get audit logs
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Audit logs retrieved successfully }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
auditRouter.get(
  "/",
  requirePermission("SETTINGS.AUDIT.VIEW", workspaceLocator()),
  enforceEnvFeature(EnvFeature.AUDIT_LOGS),
  enforcePlanFeature("auditLogs"),
  asyncHandler(auditController.getAuditLogs),
);

export default auditRouter;
