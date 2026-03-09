import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import crmController from "./crm.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const crmRouter = Router();

crmRouter.use(authorizeRoles("user", "admin", "superAdmin"));

/**
 * @swagger
 * /crm/dashboard:
 *   get:
 *     summary: Get CRM dashboard
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Dashboard data }
 */
crmRouter.get("/dashboard", asyncHandler(crmController.getDashboard));

/**
 * @swagger
 * /crm/reports:
 *   get:
 *     summary: Get CRM reports
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema: { type: string }
 *         description: Year for reports (e.g. "2024"). Defaults to current year.
 *     responses:
 *       200: { description: Reports data }
 */
crmRouter.get("/reports", asyncHandler(crmController.getReports));

/**
 * @swagger
 * /crm/reports/export:
 *   get:
 *     summary: Export CRM reports (Excel)
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema: { type: string }
 *         description: Year for export (e.g. "2024"). Defaults to current year.
 *     responses:
 *       200: { description: Excel file }
 */
crmRouter.get("/reports/export", asyncHandler(crmController.exportReportsCsv));

export default crmRouter;
