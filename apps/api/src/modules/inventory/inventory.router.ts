import { Router } from "express";
import { requirePermission } from "@/middlewares/requirePermission";
import {
  paramLocator,
  workspaceLocator,
} from "@/shared/permissions/resourceLocator";
import inventoryController from "@/modules/inventory/inventory.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const inventoryRouter = Router();

/**
 * @swagger
 * /inventory/summary:
 *   get:
 *     summary: Get inventory summary across all locations
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory summary retrieved successfully
 */
// Summary aggregates across products/locations — scope to workspace VIEW.
inventoryRouter.get(
  "/summary",
  requirePermission("INVENTORY.PRODUCTS.VIEW", workspaceLocator()),
  asyncHandler(inventoryController.getInventorySummary),
);

/**
 * @swagger
 * /inventory/location/{locationId}:
 *   get:
 *     summary: Get inventory for a specific location
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: locationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *         name: categoryId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [name, price, createdAt], default: name }
 *         description: Sort field. name = product name, price = MRP, createdAt = product creation date
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: asc }
 *     responses:
 *       200:
 *         description: Location inventory retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedInventoryResponse'
 *       404:
 *         description: Location not found
 */
inventoryRouter.get(
  "/location/:locationId",
  requirePermission(
    "INVENTORY.LOCATIONS.VIEW",
    paramLocator("LOCATION", "locationId"),
  ),
  asyncHandler(inventoryController.getLocationInventory),
);

/**
 * @swagger
 * /inventory/product/{productId}:
 *   get:
 *     summary: Get stock for a specific product across all locations
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Product stock retrieved successfully
 *       404:
 *         description: Product not found
 */
inventoryRouter.get(
  "/product/:productId",
  requirePermission(
    "INVENTORY.PRODUCTS.VIEW",
    paramLocator("PRODUCT", "productId"),
  ),
  asyncHandler(inventoryController.getProductStock),
);

/**
 * @swagger
 * /inventory/adjust:
 *   put:
 *     summary: Adjust inventory quantity (add or subtract)
 *     tags: [Inventory]
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
 *               - variationId
 *               - quantity
 *             properties:
 *               locationId:
 *                 type: string
 *                 format: uuid
 *               variationId:
 *                 type: string
 *                 format: uuid
 *               quantity:
 *                 type: integer
 *                 description: Positive to add, negative to subtract
 *               reason:
 *                 type: string
 *                 description: Reason for adjustment
 *     responses:
 *       200:
 *         description: Inventory adjusted successfully
 *       400:
 *         description: Invalid adjustment
 *       404:
 *         description: Location or variation not found
 */
// Adjust crosses (location × variation); workspace-scoped ADJUST_STOCK.
// The controller can fail-closed on the specific location/product if a
// finer-grained overwrite is configured via permissionService.assert.
inventoryRouter.put(
  "/adjust",
  requirePermission("INVENTORY.PRODUCTS.ADJUST_STOCK", workspaceLocator()),
  asyncHandler(inventoryController.adjustInventory),
);

/**
 * @swagger
 * /inventory/set:
 *   put:
 *     summary: Set inventory quantity to an absolute value
 *     tags: [Inventory]
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
 *               - variationId
 *               - quantity
 *             properties:
 *               locationId:
 *                 type: string
 *                 format: uuid
 *               variationId:
 *                 type: string
 *                 format: uuid
 *               quantity:
 *                 type: integer
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Inventory set successfully
 *       400:
 *         description: Invalid quantity
 *       404:
 *         description: Location or variation not found
 */
inventoryRouter.put(
  "/set",
  requirePermission("INVENTORY.PRODUCTS.ADJUST_STOCK", workspaceLocator()),
  asyncHandler(inventoryController.setInventory),
);

export default inventoryRouter;
