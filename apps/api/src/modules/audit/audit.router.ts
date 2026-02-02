import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import auditController from "@/modules/audit/audit.controller";

const auditRouter = Router();

auditRouter.get(
  "/",
  verifyToken,
  authorizeRoles("superAdmin"),
  auditController.getAuditLogs,
);

export default auditRouter;
