import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import transferController from "@/modules/transfers/transfer.controller";
import { asyncHandler } from "@/middlewares/errorHandler";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/middlewares/validateRequest";
import {
  cancelTransferSchema,
  createTransferSchema,
  transferIdParamsSchema,
  transferListQuerySchema,
} from "./transfer.schema";

const transferRouter = Router();

/**
 * @swagger
 * /transfers:
 *   post:
 *     summary: Create a new transfer request
 *     tags: [Transfers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fromLocationId
 *               - toLocationId
 *               - items
 *             properties:
 *               fromLocationId:
 *                 type: string
 *                 format: uuid
 *               toLocationId:
 *                 type: string
 *                 format: uuid
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
 *                       minimum: 1
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Transfer created successfully
 *       400:
 *         description: Invalid request or insufficient stock
 *       404:
 *         description: Location not found
 */
transferRouter.post(
  "/",
  verifyToken,
  authorizeRoles("admin", "superAdmin"),
  validateBody(createTransferSchema),
  asyncHandler(transferController.createTransfer),
);

/**
 * @swagger
 * /transfers:
 *   get:
 *     summary: Get all transfers with filtering
 *     tags: [Transfers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, IN_TRANSIT, COMPLETED, CANCELLED]
 *       - in: query
 *         name: fromLocationId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: toLocationId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by either from or to location
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
 *         description: Transfers retrieved successfully
 */
transferRouter.get(
  "/",
  verifyToken,
  authorizeRoles("admin", "user", "superAdmin"),
  validateQuery(transferListQuerySchema),
  asyncHandler(transferController.getAllTransfers),
);

/**
 * @swagger
 * /transfers/{id}:
 *   get:
 *     summary: Get transfer by ID with full details
 *     tags: [Transfers]
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
 *         description: Transfer retrieved successfully
 *       404:
 *         description: Transfer not found
 */
transferRouter.get(
  "/:id",
  verifyToken,
  authorizeRoles("admin", "user", "superAdmin"),
  validateParams(transferIdParamsSchema),
  asyncHandler(transferController.getTransferById),
);

/**
 * @swagger
 * /transfers/{id}/logs:
 *   get:
 *     summary: Get audit logs for a transfer
 *     tags: [Transfers]
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
 *         description: Transfer logs retrieved successfully
 *       404:
 *         description: Transfer not found
 */
transferRouter.get(
  "/:id/logs",
  verifyToken,
  authorizeRoles("admin", "user", "superAdmin"),
  validateParams(transferIdParamsSchema),
  asyncHandler(transferController.getTransferLogs),
);

/**
 * @swagger
 * /transfers/{id}/approve:
 *   put:
 *     summary: Approve a pending transfer
 *     tags: [Transfers]
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
 *         description: Transfer approved successfully
 *       400:
 *         description: Cannot approve transfer (wrong status or insufficient stock)
 *       404:
 *         description: Transfer not found
 */
transferRouter.put(
  "/:id/approve",
  verifyToken,
  authorizeRoles("admin", "superAdmin"),
  validateParams(transferIdParamsSchema),
  asyncHandler(transferController.approveTransfer),
);

/**
 * @swagger
 * /transfers/{id}/transit:
 *   put:
 *     summary: Mark transfer as in transit (deducts stock from source)
 *     tags: [Transfers]
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
 *         description: Transfer marked as in transit
 *       400:
 *         description: Cannot start transit (wrong status)
 *       404:
 *         description: Transfer not found
 */
transferRouter.put(
  "/:id/transit",
  verifyToken,
  authorizeRoles("admin", "superAdmin"),
  validateParams(transferIdParamsSchema),
  asyncHandler(transferController.startTransit),
);

/**
 * @swagger
 * /transfers/{id}/complete:
 *   put:
 *     summary: Complete transfer (adds stock to destination)
 *     tags: [Transfers]
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
 *         description: Transfer completed successfully
 *       400:
 *         description: Cannot complete transfer (wrong status)
 *       404:
 *         description: Transfer not found
 */
transferRouter.put(
  "/:id/complete",
  verifyToken,
  authorizeRoles("admin", "superAdmin"),
  validateParams(transferIdParamsSchema),
  asyncHandler(transferController.completeTransfer),
);

/**
 * @swagger
 * /transfers/{id}/cancel:
 *   put:
 *     summary: Cancel a transfer
 *     tags: [Transfers]
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
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transfer cancelled successfully
 *       400:
 *         description: Cannot cancel transfer (already completed)
 *       404:
 *         description: Transfer not found
 */
transferRouter.put(
  "/:id/cancel",
  verifyToken,
  authorizeRoles("admin", "superAdmin"),
  validateParams(transferIdParamsSchema),
  validateBody(cancelTransferSchema),
  asyncHandler(transferController.cancelTransfer),
);

export default transferRouter;
