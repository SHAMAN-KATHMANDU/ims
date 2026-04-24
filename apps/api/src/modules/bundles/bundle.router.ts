import { Router } from "express";
import { requirePermission } from "@/middlewares/requirePermission";
import {
  paramLocator,
  workspaceLocator,
} from "@/shared/permissions/resourceLocator";
import { asyncHandler } from "@/middlewares/errorHandler";
import { resolveTenantFromHostname } from "@/middlewares/hostnameResolver";
import bundleController from "./bundle.controller";

const bundleRouter = Router();

/**
 * @swagger
 * /bundles:
 *   get:
 *     summary: List bundles (paginated)
 *     tags: [Bundles]
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     summary: Create bundle
 *     tags: [Bundles]
 *     security: [{ bearerAuth: [] }]
 * /bundles/{id}:
 *   get:
 *     summary: Get bundle by id
 *     tags: [Bundles]
 *   patch:
 *     summary: Update bundle
 *     tags: [Bundles]
 *   delete:
 *     summary: Soft-delete bundle
 *     tags: [Bundles]
 */
// List — service-layer filterVisible (Phase 3 follow-up). See RBAC_CONTRACT §5.
bundleRouter.get("/", asyncHandler(bundleController.getAllBundles));
bundleRouter.post(
  "/",
  requirePermission("INVENTORY.BUNDLES.CREATE", workspaceLocator()),
  asyncHandler(bundleController.createBundle),
);
bundleRouter.get(
  "/:id",
  requirePermission("INVENTORY.BUNDLES.VIEW", paramLocator("BUNDLE")),
  asyncHandler(bundleController.getBundleById),
);
bundleRouter.patch(
  "/:id",
  requirePermission("INVENTORY.BUNDLES.UPDATE", paramLocator("BUNDLE")),
  asyncHandler(bundleController.updateBundle),
);
bundleRouter.delete(
  "/:id",
  requirePermission("INVENTORY.BUNDLES.DELETE", paramLocator("BUNDLE")),
  asyncHandler(bundleController.deleteBundle),
);

export default bundleRouter;

export const publicBundleRouter = Router();
publicBundleRouter.use(resolveTenantFromHostname());
publicBundleRouter.get("/", asyncHandler(bundleController.listPublicBundles));
publicBundleRouter.get(
  "/:slug",
  asyncHandler(bundleController.getPublicBundleBySlug),
);
