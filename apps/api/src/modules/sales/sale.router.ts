import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import saleController from "@/modules/sales/sale.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const saleRouter = Router();

/**
 * @swagger
 * /sales:
 *   post:
 *     summary: Create a new sale
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - locationId
 *               - items
 *             properties:
 *               locationId:
 *                 type: string
 *                 format: uuid
 *               memberPhone:
 *                 type: string
 *                 description: Optional phone for member sale
 *               memberName:
 *                 type: string
 *                 description: Optional member name
 *               contactId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: Optional CRM contact ID
 *               isCreditSale:
 *                 type: boolean
 *                 description: If true, sale is recorded as credit (payments can be added later)
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - variationId
 *                     - quantity
 *                   properties:
 *                     variationId:
 *                       type: string
 *                       format: uuid
 *                     subVariationId:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                       description: Optional sub-variation (e.g. size) for this line
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *                     discountId:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                       description: Optional discount type to apply to this line
 *                     promoCode:
 *                       type: string
 *                       description: Optional promo code for this line
 *               notes:
 *                 type: string
 *               payments:
 *                 type: array
 *                 description: Optional initial payments (for non-credit or partial payment)
 *                 items:
 *                   type: object
 *                   required: [method, amount]
 *                   properties:
 *                     method:
 *                       type: string
 *                       description: Tenant-configured payment method code (e.g. CASH, CARD, BANK_TRANSFER)
 *                     amount:
 *                       type: number
 *                       minimum: 0
 *     responses:
 *       201:
 *         description: Sale created successfully
 *       400:
 *         description: Invalid request data or insufficient stock
 */
saleRouter.post(
  "/",
  authorizeRoles("user", "admin", "superAdmin"),
  asyncHandler(saleController.createSale),
);

/**
 * @swagger
 * /sales/preview:
 *   post:
 *     summary: Preview sale total (discount + promo, no DB writes)
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [locationId, items]
 *             properties:
 *               locationId:
 *                 type: string
 *                 format: uuid
 *               memberPhone:
 *                 type: string
 *               memberName:
 *                 type: string
 *               contactId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: Optional CRM contact ID
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [variationId, quantity]
 *                   properties:
 *                     variationId:
 *                       type: string
 *                       format: uuid
 *                     subVariationId:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *                     discountId:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                     promoCode:
 *                       type: string
 *     responses:
 *       200:
 *         description: Returns subtotal, discount (total off), productDiscount, promoDiscount, promoOverrodeProductDiscount, total
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SalePreviewResponse'
 */
saleRouter.post(
  "/preview",
  authorizeRoles("user", "admin", "superAdmin"),
  asyncHandler(saleController.previewSale),
);

/**
 * @swagger
 * /sales:
 *   get:
 *     summary: Get all sales with pagination and filtering
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 100 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, total, subtotal, discount, saleCode, type, id]
 *         description: Sort field. createdAt = date added, total = total cost.
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *       - in: query
 *         name: locationId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: createdById
 *         schema: { type: string, format: uuid }
 *         description: Filter by user who created the sale
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [GENERAL, MEMBER] }
 *       - in: query
 *         name: isCreditSale
 *         schema: { type: string, enum: [true, false] }
 *         description: Filter credit sales only
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Sales retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedSalesResponse'
 */
saleRouter.get(
  "/",
  authorizeRoles("user", "admin", "superAdmin"),
  asyncHandler(saleController.getAllSales),
);

/**
 * @swagger
 * /sales/me/since-last-login:
 *   get:
 *     summary: Get current user's sales since last login
 *     tags: [Sales]
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
 *     responses:
 *       200:
 *         description: Sales since last login
 */
saleRouter.get(
  "/me/since-last-login",
  authorizeRoles("user", "admin", "superAdmin"),
  asyncHandler(saleController.getSalesSinceLastLogin),
);

/**
 * @swagger
 * /sales/me:
 *   get:
 *     summary: Get current user's sales (full history, User Sales Report)
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, total, subtotal, discount, saleCode, type, id]
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: locationId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [GENERAL, MEMBER] }
 *       - in: query
 *         name: isCreditSale
 *         schema: { type: string, enum: [true, false] }
 *     responses:
 *       200:
 *         description: Current user's sales (full history)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedSalesResponse'
 */
saleRouter.get(
  "/me",
  authorizeRoles("user", "admin", "superAdmin"),
  asyncHandler(saleController.getMySales),
);

/**
 * @swagger
 * /sales/analytics/summary:
 *   get:
 *     summary: Get sales summary analytics
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Sales summary retrieved successfully
 */
saleRouter.get(
  "/analytics/summary",
  authorizeRoles("user", "admin", "superAdmin"),
  asyncHandler(saleController.getSalesSummary),
);

/**
 * @swagger
 * /sales/analytics/by-location:
 *   get:
 *     summary: Get sales breakdown by location
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Sales by location retrieved successfully
 */
saleRouter.get(
  "/analytics/by-location",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(saleController.getSalesByLocation),
);

/**
 * @swagger
 * /sales/analytics/daily:
 *   get:
 *     summary: Get daily sales for chart
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 30, minimum: 1, maximum: 365 }
 *         description: Number of days for the chart
 *     responses:
 *       200:
 *         description: Daily sales data retrieved successfully
 */
saleRouter.get(
  "/analytics/daily",
  authorizeRoles("user", "admin", "superAdmin"),
  asyncHandler(saleController.getDailySales),
);

/**
 * @swagger
 * /sales/{id}/payments:
 *   post:
 *     summary: Add payment to a credit sale
 *     tags: [Sales]
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
 *             required: [method, amount]
 *             properties:
 *               method:
 *                 type: string
 *                 description: Tenant-configured payment method code
 *               amount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Payment added successfully
 *       400:
 *         description: Invalid request or not a credit sale or amount exceeds balance due
 *       404:
 *         description: Sale not found
 */
saleRouter.post(
  "/:id/payments",
  authorizeRoles("user", "admin", "superAdmin"),
  asyncHandler(saleController.addPayment),
);

/**
 * @swagger
 * /sales/{id}/receipt:
 *   get:
 *     summary: Download sale receipt as PDF
 *     tags: [Sales]
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
 *         description: PDF receipt
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Sale not found
 */
saleRouter.get(
  "/:id/receipt",
  authorizeRoles("user", "admin", "superAdmin"),
  asyncHandler(saleController.getReceiptPdf),
);

/**
 * @swagger
 * /sales/{id}:
 *   get:
 *     summary: Get sale details by ID
 *     tags: [Sales]
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
 *         description: Sale retrieved successfully
 *       404:
 *         description: Sale not found
 */
saleRouter.get(
  "/:id",
  authorizeRoles("user", "admin", "superAdmin"),
  asyncHandler(saleController.getSaleById),
);

/**
 * @swagger
 * /sales/{id}:
 *   delete:
 *     summary: Soft delete a sale (restores inventory, decrements promo usage)
 *     tags: [Sales]
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deleteReason:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Sale deleted successfully
 *       404:
 *         description: Sale not found or already deleted
 */
saleRouter.delete(
  "/:id",
  authorizeRoles("user", "admin", "superAdmin"),
  asyncHandler(saleController.deleteSale),
);

/**
 * @swagger
 * /sales/{id}/edit:
 *   post:
 *     summary: Edit sale (creates new revision, restores parent inventory)
 *     tags: [Sales]
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
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [variationId, quantity]
 *                   properties:
 *                     variationId: { type: string, format: uuid }
 *                     subVariationId: { type: string, format: uuid, nullable: true }
 *                     quantity: { type: integer, minimum: 1 }
 *                     discountId: { type: string, format: uuid, nullable: true }
 *                     promoCode: { type: string }
 *               notes: { type: string }
 *               payments: { type: array, items: { type: object, properties: { method: { type: string }, amount: { type: number } } } }
 *               editReason: { type: string, nullable: true }
 *     responses:
 *       200:
 *         description: Sale updated (new revision created)
 *       400:
 *         description: Invalid request or sale is superseded
 *       404:
 *         description: Sale not found
 */
saleRouter.post(
  "/:id/edit",
  authorizeRoles("user", "admin", "superAdmin"),
  asyncHandler(saleController.editSale),
);

export default saleRouter;
