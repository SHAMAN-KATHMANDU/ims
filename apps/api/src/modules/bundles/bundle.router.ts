import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
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
bundleRouter.get(
  "/",
  authorizeRoles("user", "admin", "superAdmin"),
  asyncHandler(bundleController.getAllBundles),
);
bundleRouter.post(
  "/",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(bundleController.createBundle),
);
bundleRouter.get(
  "/:id",
  authorizeRoles("user", "admin", "superAdmin"),
  asyncHandler(bundleController.getBundleById),
);
bundleRouter.patch(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(bundleController.updateBundle),
);
bundleRouter.delete(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
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
