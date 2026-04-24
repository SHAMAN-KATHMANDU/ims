/**
 * Nav Menus Router — tenant-scoped editable navigation.
 * Mounted under /nav-menus; inherits auth + tenant resolution.
 * Permissions: WEBSITE.NAV_MENUS.*
 */

import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { asyncHandler } from "@/middlewares/errorHandler";
import { requirePermission } from "@/middlewares/requirePermission";
import { workspaceLocator } from "@/shared/permissions/resourceLocator";
import controller from "./nav-menus.controller";

const router = Router();

router.use(enforceEnvFeature(EnvFeature.TENANT_WEBSITES));
router.use(requirePermission("WEBSITE.NAV_MENUS.VIEW", workspaceLocator()));

/**
 * @swagger
 * /nav-menus:
 *   get:
 *     summary: List all nav menus for the current tenant
 *     tags: [NavMenus]
 *     security:
 *       - bearerAuth: []
 */
router.get("/", asyncHandler(controller.list));

/**
 * @swagger
 * /nav-menus:
 *   put:
 *     summary: Upsert a nav menu for a slot
 *     tags: [NavMenus]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  "/",
  requirePermission("WEBSITE.NAV_MENUS.UPDATE", workspaceLocator()),
  asyncHandler(controller.upsert),
);

/**
 * @swagger
 * /nav-menus/{slot}:
 *   get:
 *     summary: Get one nav menu by slot
 *     tags: [NavMenus]
 *     security:
 *       - bearerAuth: []
 */
router.get("/:slot", asyncHandler(controller.getBySlot));

/**
 * @swagger
 * /nav-menus/{slot}:
 *   delete:
 *     summary: Delete a nav menu
 *     tags: [NavMenus]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  "/:slot",
  requirePermission("WEBSITE.NAV_MENUS.DELETE", workspaceLocator()),
  asyncHandler(controller.remove),
);

export default router;
