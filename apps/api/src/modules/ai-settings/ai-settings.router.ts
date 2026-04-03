import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import aiSettingsController from "./ai-settings.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const aiSettingsRouter = Router();

aiSettingsRouter.get(
  "/",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(aiSettingsController.getAiSettings),
);

aiSettingsRouter.put(
  "/",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(aiSettingsController.updateAiSettings),
);

export default aiSettingsRouter;
