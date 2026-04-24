/**
 * Collections router — tenant-admin CRUD.
 * Mounted under /collections; inherits auth + tenant resolution.
 */

import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import { requirePermission } from "@/middlewares/requirePermission";
import {
  paramLocator,
  workspaceLocator,
} from "@/shared/permissions/resourceLocator";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { asyncHandler } from "@/middlewares/errorHandler";
import controller from "./collections.controller";

const router = Router();

router.use(enforceEnvFeature(EnvFeature.TENANT_WEBSITES));

// List — service-layer filterVisible (Phase 3 follow-up). See RBAC_CONTRACT §5.
router.get("/", asyncHandler(controller.list));

router.post(
  "/",
  requirePermission("INVENTORY.COLLECTIONS.CREATE", workspaceLocator()),
  asyncHandler(controller.create),
);

router.get(
  "/:id",
  requirePermission("INVENTORY.COLLECTIONS.VIEW", paramLocator("COLLECTION")),
  asyncHandler(controller.get),
);

router.patch(
  "/:id",
  requirePermission("INVENTORY.COLLECTIONS.UPDATE", paramLocator("COLLECTION")),
  asyncHandler(controller.update),
);

router.delete(
  "/:id",
  requirePermission("INVENTORY.COLLECTIONS.DELETE", paramLocator("COLLECTION")),
  asyncHandler(controller.remove),
);

// Reordering / managing the product set is a REORDER action per catalog §3
router.put(
  "/:id/products",
  requirePermission(
    "INVENTORY.COLLECTIONS.REORDER",
    paramLocator("COLLECTION"),
  ),
  asyncHandler(controller.setProducts),
);

export default router;
