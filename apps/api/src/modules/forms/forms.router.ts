/**
 * Forms router — tenant-admin CRUD for reusable form definitions.
 * Mounted under /forms; inherits auth + tenant resolution.
 */

import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { asyncHandler } from "@/middlewares/errorHandler";
import controller from "./forms.controller";

const router = Router();

router.use(enforceEnvFeature(EnvFeature.FORMS_DATA_BACKED));

router.get("/", asyncHandler(controller.list));

router.post("/", asyncHandler(controller.create));

router.get("/:id", asyncHandler(controller.get));

router.patch("/:id", asyncHandler(controller.update));

router.delete("/:id", asyncHandler(controller.delete));

router.get("/:id/submissions", asyncHandler(controller.listSubmissions));

export default router;
