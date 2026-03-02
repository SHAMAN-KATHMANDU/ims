import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { asyncHandler } from "@/middlewares/errorHandler";
import crmSettingsController from "./crm-settings.controller";

const crmSettingsRouter = Router();

// ── Sources ──────────────────────────────────────────────────────────────────
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

// ── Journey Types ─────────────────────────────────────────────────────────────
crmSettingsRouter.get(
  "/journey-types",
  authorizeRoles("user", "admin", "superAdmin"),
  asyncHandler(crmSettingsController.getAllJourneyTypes),
);
crmSettingsRouter.post(
  "/journey-types",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(crmSettingsController.createJourneyType),
);
crmSettingsRouter.put(
  "/journey-types/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(crmSettingsController.updateJourneyType),
);
crmSettingsRouter.delete(
  "/journey-types/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(crmSettingsController.deleteJourneyType),
);

export default crmSettingsRouter;
