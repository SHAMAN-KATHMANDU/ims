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
 *         name: type
 *         schema: { type: string }
 *     responses:
 *       200: { description: Reports data }
 */
crmRouter.get("/reports", asyncHandler(crmController.getReports));

/**
 * @swagger
 * /crm/reports/export:
 *   get:
 *     summary: Export CRM reports CSV
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *     responses:
 *       200: { description: CSV file }
 */
crmRouter.get("/reports/export", asyncHandler(crmController.exportReportsCsv));

export default crmRouter;
