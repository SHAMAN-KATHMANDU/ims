import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message, stack]
 *             properties:
 *               message: { type: string }
 *               stack: { type: string }
 *               url: { type: string }
 *               userAgent: { type: string }
 *     responses:
 *       201:
 *         description: Error report submitted
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */
errorReportRouter.post(
  "/",
  authorizeRoles("user", "admin", "superAdmin"),
  asyncHandler(errorReportController.create),
);

/**
 * @swagger
 * /error-reports:
 *   get:
 *     summary: List error reports (superAdmin only)
 *     tags: [ErrorReports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [open, acknowledged, resolved] }
 *     responses:
 *       200:
 *         description: Error reports list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedErrorReportsResponse'
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
errorReportRouter.get(
  "/",
  authorizeRoles("superAdmin"),
  asyncHandler(errorReportController.list),
);

/**
 * @swagger
 * /error-reports/{id}:
 *   patch:
 *     summary: Update error report status (superAdmin only)
 *     tags: [ErrorReports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string, enum: [open, acknowledged, resolved] }
 *     responses:
 *       200:
 *         description: Error report updated
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Error report not found }
 */
errorReportRouter.patch(
  "/:id",
  authorizeRoles("superAdmin"),
  asyncHandler(errorReportController.updateStatus),
);

export default errorReportRouter;
