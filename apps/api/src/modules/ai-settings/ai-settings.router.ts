import { Router } from "express";
import { requirePermission } from "@/middlewares/requirePermission";
import { workspaceLocator } from "@/shared/permissions/resourceLocator";
import aiSettingsController from "./ai-settings.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const aiSettingsRouter = Router();

aiSettingsRouter.get(
  "/",
  requirePermission("SETTINGS.AI.VIEW", workspaceLocator()),
  asyncHandler(aiSettingsController.getAiSettings),
);

aiSettingsRouter.put(
  "/",
  requirePermission("SETTINGS.AI.UPDATE", workspaceLocator()),
  asyncHandler(aiSettingsController.updateAiSettings),
);

export default aiSettingsRouter;
