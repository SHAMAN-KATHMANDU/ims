/**
 * Reviews router — tenant-admin moderation endpoints.
 * Mounted under /reviews; inherits auth + tenant resolution.
 */

import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { asyncHandler } from "@/middlewares/errorHandler";
import controller from "./reviews.controller";

const router = Router();

router.use(enforceEnvFeature(EnvFeature.TENANT_WEBSITES));
router.use(authorizeRoles("admin", "superAdmin"));

router.get("/", asyncHandler(controller.list));
router.patch("/:id", asyncHandler(controller.update));
router.delete("/:id", asyncHandler(controller.remove));

export default router;
