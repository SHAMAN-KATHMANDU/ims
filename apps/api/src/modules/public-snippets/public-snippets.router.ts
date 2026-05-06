/**
 * Public Snippets Router — unauthenticated read of one snippet by id,
 * resolved against the request Host. Used by the tenant-site to expand
 * `snippet-ref` blocks at request time.
 */

import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import { asyncHandler } from "@/middlewares/errorHandler";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { resolveTenantFromHostname } from "@/middlewares/hostnameResolver";
import controller from "./public-snippets.controller";

const router = Router();

router.use(enforceEnvFeature(EnvFeature.TENANT_WEBSITES));
router.use(resolveTenantFromHostname());

router.get("/:id", asyncHandler(controller.getById));

export default router;
