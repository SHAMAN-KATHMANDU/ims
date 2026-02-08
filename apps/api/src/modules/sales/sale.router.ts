import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import saleController from "@/modules/sales/sale.controller";

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
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     variationId:
 *                       type: string
 *                       format: uuid
 *                     quantity:
 *                       type: integer
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Sale created successfully
 *       400:
 *         description: Invalid request data or insufficient stock
 */
saleRouter.post(
  "/",
  verifyToken,
  authorizeRoles("user", "admin", "superAdmin"),
  saleController.createSale,
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [locationId, items]
 *             properties:
 *               locationId: { type: string, format: uuid }
 *               memberPhone: { type: string }
 *               memberName: { type: string }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     variationId: { type: string, format: uuid }
 *                     quantity: { type: integer }
 *                     promoCode: { type: string }
 *     responses:
 *       200:
 *         description: Returns subtotal, discount, total
 */
saleRouter.post(
  "/preview",
  verifyToken,
  authorizeRoles("user", "admin", "superAdmin"),
  saleController.previewSale,
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
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [GENERAL, MEMBER]
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
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, total, subtotal, discount, saleCode, type, id]
 *         description: Sort field. createdAt = date added, total = total cost.
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort direction (ascending or descending).
 *     responses:
 *       200:
 *         description: Sales retrieved successfully
 */
saleRouter.get(
  "/",
  verifyToken,
  authorizeRoles("user", "admin", "superAdmin"),
  saleController.getAllSales,
);

/**
 * @swagger
 * /sales/me/since-last-login:
 *   get:
 *     summary: Get current user's sales since last login (User Sales Report)
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
  verifyToken,
  authorizeRoles("user", "admin", "superAdmin"),
  saleController.getSalesSinceLastLogin,
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
  verifyToken,
  authorizeRoles("user", "admin", "superAdmin"),
  saleController.getSalesSummary,
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
  verifyToken,
  authorizeRoles("admin", "superAdmin"),
  saleController.getSalesByLocation,
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
 *         schema:
 *           type: integer
 *         description: Number of days (default 30)
 *     responses:
 *       200:
 *         description: Daily sales data retrieved successfully
 */
saleRouter.get(
  "/analytics/daily",
  verifyToken,
  authorizeRoles("user", "admin", "superAdmin"),
  saleController.getDailySales,
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
 *                 enum: [CASH, CARD, CHEQUE, FONEPAY, QR]
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
  verifyToken,
  authorizeRoles("user", "admin", "superAdmin"),
  saleController.addPayment,
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
  verifyToken,
  authorizeRoles("user", "admin", "superAdmin"),
  saleController.getSaleById,
);

export default saleRouter;
