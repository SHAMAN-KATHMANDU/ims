import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import { requirePermission } from "@/middlewares/requirePermission";
import {
  paramLocator,
  workspaceLocator,
} from "@/shared/permissions/resourceLocator";
import { enforcePlanFeature } from "@/middlewares/enforcePlanLimits";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import promoController from "@/modules/promos/promo.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const promoRouter = Router();

promoRouter.use(enforceEnvFeature(EnvFeature.PROMOTIONS));

/**
 * @swagger
 * /promos:
 *   post:
 *     summary: Create a new promo code
 *     tags: [Promos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - valueType
 *               - value
 *             properties:
 *               code:
 *                 type: string
 *               description:
 *                 type: string
 *               valueType:
 *                 type: string
 *                 enum: [PERCENTAGE, FLAT]
 *               value:
 *                 type: number
 *               overrideDiscounts:
 *                 type: boolean
 *               allowStacking:
 *                 type: boolean
 *               eligibility:
 *                 type: string
 *                 enum: [ALL, MEMBER, NON_MEMBER, WHOLESALE]
 *               validFrom:
 *                 type: string
 *                 format: date-time
 *               validTo:
 *                 type: string
 *                 format: date-time
 *               usageLimit:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       201:
 *         description: Promo code created successfully
 *       400:
 *         description: Invalid request data
 *       409:
 *         description: Promo code already exists
 */
promoRouter.post(
  "/",
  requirePermission("INVENTORY.PROMOS.CREATE", workspaceLocator()),
  enforcePlanFeature("promoManagement"),
  asyncHandler(promoController.createPromo),
);

/**
 * @swagger
 * /promos:
 *   get:
 *     summary: Get all promo codes with pagination and filtering
 *     tags: [Promos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *         description: Filter by active status (true/false)
 *     responses:
 *       200:
 *         description: Promo codes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedPromosResponse'
 */
// List — service-layer filterVisible (Phase 3 follow-up). See RBAC_CONTRACT §5.
promoRouter.get("/", asyncHandler(promoController.getAllPromos));

/**
 * @swagger
 * /promos/by-code/{code}:
 *   get:
 *     summary: Get promo code by code (case-insensitive, for sale flow validation)
 *     tags: [Promos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Promo code found
 *       404:
 *         description: Promo code not found
 */
// Lookup-by-code — used during sale flow; scope to workspace VIEW
promoRouter.get(
  "/by-code/:code",
  requirePermission("INVENTORY.PROMOS.VIEW", workspaceLocator()),
  asyncHandler(promoController.getPromoByCode),
);

/**
 * @swagger
 * /promos/{id}:
 *   get:
 *     summary: Get promo code by ID
 *     tags: [Promos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Promo code retrieved successfully
 *       404:
 *         description: Promo code not found
 */
promoRouter.get(
  "/:id",
  requirePermission("INVENTORY.PROMOS.VIEW", paramLocator("PROMO")),
  asyncHandler(promoController.getPromoById),
);

/**
 * @swagger
 * /promos/{id}:
 *   put:
 *     summary: Update promo code
 *     tags: [Promos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               description:
 *                 type: string
 *               valueType:
 *                 type: string
 *                 enum: [PERCENTAGE, FLAT]
 *               value:
 *                 type: number
 *               overrideDiscounts:
 *                 type: boolean
 *               allowStacking:
 *                 type: boolean
 *               eligibility:
 *                 type: string
 *                 enum: [ALL, MEMBER, NON_MEMBER, WHOLESALE]
 *               validFrom:
 *                 type: string
 *                 format: date-time
 *               validTo:
 *                 type: string
 *                 format: date-time
 *               usageLimit:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Promo code updated successfully
 *       404:
 *         description: Promo code not found
 */
promoRouter.put(
  "/:id",
  requirePermission("INVENTORY.PROMOS.UPDATE", paramLocator("PROMO")),
  enforcePlanFeature("promoManagement"),
  asyncHandler(promoController.updatePromo),
);

/**
 * @swagger
 * /promos/{id}:
 *   delete:
 *     summary: Deactivate a promo code
 *     tags: [Promos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Promo code deactivated successfully
 *       404:
 *         description: Promo code not found
 */
// Soft-deactivate a promo maps closer to END than DELETE; keep permission
// aligned with the semantic so future UI actions (`End promo`) use one key.
promoRouter.delete(
  "/:id",
  requirePermission("INVENTORY.PROMOS.END", paramLocator("PROMO")),
  enforcePlanFeature("promoManagement"),
  asyncHandler(promoController.deletePromo),
);

export default promoRouter;
