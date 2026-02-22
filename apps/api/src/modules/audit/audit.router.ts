import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import auditController from "@/modules/audit/audit.controller";
import { asyncHandler } from "@/middlewares/errorHandler";
import { validateQuery } from "@/middlewares/validateRequest";
import { auditLogsQuerySchema } from "./audit.schema";

const auditRouter = Router();

auditRouter.get(
  "/",
  verifyToken,
  authorizeRoles("superAdmin"),
  validateQuery(auditLogsQuerySchema),
  asyncHandler(auditController.getAuditLogs),
);

export default auditRouter;
