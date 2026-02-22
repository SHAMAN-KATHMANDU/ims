import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import crmController from "./crm.controller";
import { asyncHandler } from "@/middlewares/errorHandler";
import { validateQuery } from "@/middlewares/validateRequest";
import { crmReportsQuerySchema } from "./crm.schema";

const crmRouter = Router();

crmRouter.use(verifyToken);
crmRouter.use(authorizeRoles("user", "admin", "superAdmin"));

crmRouter.get("/dashboard", asyncHandler(crmController.getDashboard));
crmRouter.get(
  "/reports",
  validateQuery(crmReportsQuerySchema),
  asyncHandler(crmController.getReports),
);
crmRouter.get(
  "/reports/export",
  validateQuery(crmReportsQuerySchema),
  asyncHandler(crmController.exportReportsCsv),
);

export default crmRouter;
