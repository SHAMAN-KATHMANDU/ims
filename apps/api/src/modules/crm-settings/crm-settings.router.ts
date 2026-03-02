import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { asyncHandler } from "@/middlewares/errorHandler";
import crmSettingsController from "./crm-settings.controller";

const crmSettingsRouter = Router();

crmSettingsRouter.get(
  "/sources",
  authorizeRoles("user", "admin", "superAdmin"),
  asyncHandler(crmSettingsController.getAllSources),
);

crmSettingsRouter.post(
  "/sources",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(crmSettingsController.createSource),
);

crmSettingsRouter.put(
  "/sources/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(crmSettingsController.updateSource),
);

crmSettingsRouter.delete(
  "/sources/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(crmSettingsController.deleteSource),
);

export default crmSettingsRouter;
