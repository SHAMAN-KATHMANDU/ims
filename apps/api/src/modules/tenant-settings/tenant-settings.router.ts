import { Router } from "express";
import { asyncHandler } from "@/middlewares/errorHandler";
import { requirePermission } from "@/middlewares/requirePermission";
import { workspaceLocator } from "@/shared/permissions/resourceLocator";
import tenantSettingsController from "./tenant-settings.controller";

const tenantSettingsRouter = Router();

tenantSettingsRouter.use(
  requirePermission("SETTINGS.TENANT.VIEW", workspaceLocator()),
);

/**
 * @swagger
 * /tenant-settings/payment-methods:
 *   get:
 *     summary: Get tenant payment methods
 *     tags: [TenantSettings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Payment methods list }
 */
tenantSettingsRouter.get(
  "/payment-methods",
  asyncHandler(tenantSettingsController.getPaymentMethods),
);

/**
 * @swagger
 * /tenant-settings/payment-methods:
 *   put:
 *     summary: Replace tenant payment methods
 *     tags: [TenantSettings]
 *     security:
 *       - bearerAuth: []
 */
tenantSettingsRouter.put(
  "/payment-methods",
  requirePermission("SETTINGS.TENANT.UPDATE_BRANDING", workspaceLocator()),
  asyncHandler(tenantSettingsController.upsertPaymentMethods),
);

export default tenantSettingsRouter;
