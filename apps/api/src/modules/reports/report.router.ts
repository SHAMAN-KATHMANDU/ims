/**
 * Report router: mount report download endpoint.
 */

import { Router } from "express";
import { asyncHandler } from "@/middlewares/errorHandler";
import reportController from "./report.controller";

const reportRouter = Router();

/**
 * @swagger
 * /reports/{id}/download:
 *   get:
 *     summary: Download a report file (PDF or Excel)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Report ID
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Signed download token (HMAC)
 *       - in: query
 *         name: format
 *         required: true
 *         schema:
 *           type: string
 *           enum: [pdf, excel]
 *         description: Report format
 *     responses:
 *       200:
 *         description: File download (binary)
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       400: { description: Bad request (missing token/format) }
 *       401: { description: Invalid or expired token }
 *       403: { description: Forbidden (token/tenant mismatch) }
 *       404: { description: Report not found }
 */
reportRouter.get("/:id/download", asyncHandler(reportController.download));

export default reportRouter;
