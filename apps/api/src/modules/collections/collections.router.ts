/**
 * Collections router — tenant-admin CRUD.
 * Mounted under /collections; inherits auth + tenant resolution.
 */

import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { asyncHandler } from "@/middlewares/errorHandler";
import controller from "./collections.controller";

const router = Router();

router.use(enforceEnvFeature(EnvFeature.TENANT_WEBSITES));
router.use(authorizeRoles("admin", "superAdmin"));

router.get("/", asyncHandler(controller.list));
router.post("/", asyncHandler(controller.create));
router.get("/:id", asyncHandler(controller.get));
router.patch("/:id", asyncHandler(controller.update));
router.delete("/:id", asyncHandler(controller.remove));
router.put("/:id/products", asyncHandler(controller.setProducts));

export default router;
