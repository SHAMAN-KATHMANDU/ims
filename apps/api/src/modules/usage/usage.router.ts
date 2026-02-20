/**
 * Usage & Add-On Routes — tenant-facing endpoints for resource usage and add-on management.
 *
 * All routes are tenant-scoped (run after verifyToken → resolveTenant → checkSubscription).
 */

import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import usageController from "./usage.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const usageRouter = Router();

usageRouter.use(verifyToken);
usageRouter.use(authorizeRoles("user", "admin", "superAdmin"));

// Add-on routes (must be before /:resource to avoid matching "add-ons" as a resource)
usageRouter.get(
  "/add-ons/pricing",
  asyncHandler(usageController.getAddOnPricing),
);
usageRouter.get("/add-ons", asyncHandler(usageController.getAddOns));
usageRouter.post(
  "/add-ons/request",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(usageController.requestAddOn),
);

// Usage routes
usageRouter.get("/", asyncHandler(usageController.getUsage));
usageRouter.get("/:resource", asyncHandler(usageController.getResourceUsage));

export default usageRouter;
