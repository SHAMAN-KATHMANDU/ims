import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { asyncHandler } from "@/middlewares/errorHandler";
import tenantSettingsController from "./tenant-settings.controller";

const tenantSettingsRouter = Router();

tenantSettingsRouter.use(authorizeRoles("admin", "superAdmin"));

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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentMethods]
 *             properties:
 *               paymentMethods:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [id, code, label, enabled, order]
 *                   properties:
 *                     id: { type: string }
 *                     code: { type: string }
 *                     label: { type: string }
 *                     enabled: { type: boolean }
 *                     order: { type: integer }
 *     responses:
 *       200: { description: Payment methods updated }
 */
tenantSettingsRouter.put(
  "/payment-methods",
  asyncHandler(tenantSettingsController.upsertPaymentMethods),
);

export default tenantSettingsRouter;
