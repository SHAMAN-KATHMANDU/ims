import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import promoController from "@/modules/promos/promo.controller";
import { asyncHandler } from "@/middlewares/errorHandler";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/middlewares/validateRequest";
import {
  createPromoSchema,
  promoIdParamsSchema,
  promoListQuerySchema,
  updatePromoSchema,
} from "./promo.schema";

const promoRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Promos
 *   description: Promo code management
 */

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
  verifyToken,
  authorizeRoles("admin", "superAdmin"),
  validateBody(createPromoSchema),
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
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Promo codes retrieved successfully
 */
promoRouter.get(
  "/",
  verifyToken,
  authorizeRoles("user", "admin", "superAdmin"),
  validateQuery(promoListQuerySchema),
  asyncHandler(promoController.getAllPromos),
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
  verifyToken,
  authorizeRoles("user", "admin", "superAdmin"),
  validateParams(promoIdParamsSchema),
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
  verifyToken,
  authorizeRoles("admin", "superAdmin"),
  validateParams(promoIdParamsSchema),
  validateBody(updatePromoSchema),
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
promoRouter.delete(
  "/:id",
  verifyToken,
  authorizeRoles("admin", "superAdmin"),
  validateParams(promoIdParamsSchema),
  asyncHandler(promoController.deletePromo),
);

export default promoRouter;
