import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import transferController from "@/modules/transfers/transfer.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

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
  authorizeRoles("admin", "superAdmin"),
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
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Page number (1-based)
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, minimum: 1, maximum: 100 }
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by transfer code
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, IN_TRANSIT, COMPLETED, CANCELLED]
 *       - in: query
 *         name: fromLocationId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: toLocationId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: locationId
 *         schema: { type: string, format: uuid }
 *         description: Filter by either from or to location
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [id, transferCode, status, createdAt, approvedAt, completedAt, fromLocationName, toLocationName]
 *         description: Sort field (default createdAt). fromLocationName and toLocationName sort by related location name.
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200:
 *         description: Transfers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedTransfersResponse'
 */
transferRouter.get(
  "/",
  authorizeRoles("admin", "user", "superAdmin"),
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
  authorizeRoles("admin", "user", "superAdmin"),
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
  authorizeRoles("admin", "user", "superAdmin"),
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
  authorizeRoles("admin", "superAdmin"),
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
  authorizeRoles("admin", "superAdmin"),
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
  authorizeRoles("admin", "superAdmin"),
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
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(transferController.cancelTransfer),
);

export default transferRouter;
