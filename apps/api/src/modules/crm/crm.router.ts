import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import crmController from "./crm.controller";

const crmRouter = Router();

crmRouter.use(verifyToken);
crmRouter.use(authorizeRoles("user", "admin", "superAdmin"));

crmRouter.get("/dashboard", crmController.getDashboard);
crmRouter.get("/reports", crmController.getReports);
crmRouter.get("/reports/export", crmController.exportReportsCsv);

export default crmRouter;
