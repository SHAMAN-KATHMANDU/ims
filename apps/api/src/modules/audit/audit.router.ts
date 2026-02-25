import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { enforcePlanFeature } from "@/middlewares/enforcePlanLimits";
import auditController from "@/modules/audit/audit.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const auditRouter = Router();

auditRouter.get(
  "/",
  authorizeRoles("superAdmin"),
  enforcePlanFeature("auditLogs"),
  asyncHandler(auditController.getAuditLogs),
);

export default auditRouter;
