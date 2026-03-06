import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { enforcePlanFeature } from "@/middlewares/enforcePlanLimits";
import auditController from "@/modules/audit/audit.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const auditRouter = Router();

/**
 * @swagger
 * /audit-logs:
 *   get:
 *     summary: Get audit logs (superAdmin only)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Page number (1-based)
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 100 }
 *         description: Items per page
 *       - in: query
 *         name: userId
 *         schema: { type: string, format: uuid }
 *         description: Filter by user ID
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *         description: Filter by action (e.g. LOGIN)
 *       - in: query
 *         name: from
 *         schema: { type: string, pattern: '^\\d{4}-\\d{2}-\\d{2}$' }
 *         description: Filter from date (YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         schema: { type: string, pattern: '^\\d{4}-\\d{2}-\\d{2}$' }
 *         description: Filter to date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedAuditResponse'
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
auditRouter.get(
  "/",
  authorizeRoles("superAdmin"),
  enforcePlanFeature("auditLogs"),
  asyncHandler(auditController.getAuditLogs),
);

export default auditRouter;
