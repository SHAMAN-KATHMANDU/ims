import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import auditController from "@/modules/audit/audit.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const auditRouter = Router();

auditRouter.get(
  "/",
  verifyToken,
  authorizeRoles("superAdmin"),
  asyncHandler(auditController.getAuditLogs),
);

export default auditRouter;
