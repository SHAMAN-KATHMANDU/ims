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
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 255
 *                 description: Short title describing the error
 *               description:
 *                 type: string
 *                 maxLength: 5000
 *                 nullable: true
 *               pageUrl:
 *                 type: string
 *                 maxLength: 500
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Error report submitted
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */
errorReportRouter.post(
  "/",
  authorizeRoles("user", "admin", "superAdmin", "platformAdmin"),
  asyncHandler(errorReportController.create),
);

/**
 * @swagger
 * /error-reports:
 *   get:
 *     summary: List error reports (platformAdmin only)
 *     tags: [ErrorReports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Page number (1-based)
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [OPEN, REVIEWED, RESOLVED] }
 *         description: Filter by status
 *       - in: query
 *         name: userId
 *         schema: { type: string, format: uuid }
 *         description: Filter by user ID
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
  authorizeRoles("platformAdmin"),
  asyncHandler(errorReportController.list),
);

/**
 * @swagger
 * /error-reports/{id}:
 *   patch:
 *     summary: Update error report status (platformAdmin only)
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
 *               status: { type: string, enum: [OPEN, REVIEWED, RESOLVED] }
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
  authorizeRoles("platformAdmin"),
  asyncHandler(errorReportController.updateStatus),
);

export default errorReportRouter;
