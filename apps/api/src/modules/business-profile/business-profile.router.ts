import { Router } from "express";
import { asyncHandler } from "@/middlewares/errorHandler";
import { requirePermission } from "@/middlewares/requirePermission";
import { workspaceLocator } from "@/shared/permissions/resourceLocator";
import controller from "./business-profile.controller";

const businessProfileRouter = Router();

/**
 * @swagger
 * /me/business-profile:
 *   get:
 *     summary: Get the authenticated tenant's business profile
 *     description: |
 *       Returns the business profile (legal name, contact, address, tax IDs, etc.)
 *       for the authenticated tenant. A minimal profile is auto-created on first access.
 *     tags: [BusinessProfile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Business profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     profile:
 *                       $ref: '#/components/schemas/TenantBusinessProfile'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — requires SETTINGS.TENANT.VIEW
 */
businessProfileRouter.get(
  "/me/business-profile",
  requirePermission("SETTINGS.TENANT.VIEW", workspaceLocator()),
  asyncHandler(controller.getMine),
);

/**
 * @swagger
 * /me/business-profile:
 *   patch:
 *     summary: Update the authenticated tenant's business profile
 *     description: |
 *       Partially updates the business profile for the authenticated tenant.
 *       Only supplied fields are changed; omitted fields are left untouched.
 *     tags: [BusinessProfile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateBusinessProfileInput'
 *     responses:
 *       200:
 *         description: Business profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     profile:
 *                       $ref: '#/components/schemas/TenantBusinessProfile'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — requires SETTINGS.TENANT.UPDATE_BRANDING
 */
businessProfileRouter.patch(
  "/me/business-profile",
  requirePermission("SETTINGS.TENANT.UPDATE_BRANDING", workspaceLocator()),
  asyncHandler(controller.updateMine),
);

export default businessProfileRouter;
