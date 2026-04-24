import { Router } from "express";
import { requirePermission } from "@/middlewares/requirePermission";
import {
  paramLocator,
  workspaceLocator,
} from "@/shared/permissions/resourceLocator";
import vendorController from "@/modules/vendors/vendor.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const vendorRouter = Router();

/**
 * @swagger
 * /vendors:
 *   post:
 *     summary: Create a new vendor
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               contact:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       201:
 *         description: Vendor created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin or SuperAdmin role required
 *       409:
 *         description: Vendor with this name already exists
 */
vendorRouter.post(
  "/",
  requirePermission("INVENTORY.VENDORS.CREATE", workspaceLocator()),
  asyncHandler(vendorController.createVendor),
);

/**
 * @swagger
 * /vendors:
 *   get:
 *     summary: Get all vendors
 *     tags: [Vendors]
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
 *     responses:
 *       200:
 *         description: Vendors retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedVendorsResponse'
 */
// List endpoint — no per-route middleware; service-layer filterVisible will
// narrow the result set once Phase 3 wires it. See RBAC_CONTRACT §5.
vendorRouter.get("/", asyncHandler(vendorController.getAllVendors));

/**
 * @swagger
 * /vendors/{id}/products:
 *   get:
 *     summary: Get vendor products (paginated)
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *     responses:
 *       200:
 *         description: Vendor products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedProductsResponse'
 *       404:
 *         description: Vendor not found
 */
vendorRouter.get(
  "/:id/products",
  requirePermission("INVENTORY.VENDORS.VIEW", paramLocator("VENDOR")),
  asyncHandler(vendorController.getVendorProducts),
);

/**
 * @swagger
 * /vendors/{id}:
 *   get:
 *     summary: Get vendor by ID
 *     tags: [Vendors]
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
 *         description: Vendor retrieved successfully
 *       404:
 *         description: Vendor not found
 */
vendorRouter.get(
  "/:id",
  requirePermission("INVENTORY.VENDORS.VIEW", paramLocator("VENDOR")),
  asyncHandler(vendorController.getVendorById),
);

/**
 * @swagger
 * /vendors/{id}:
 *   put:
 *     summary: Update a vendor
 *     tags: [Vendors]
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
 *               name:
 *                 type: string
 *               contact:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Vendor updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Vendor not found
 *       409:
 *         description: Vendor name already exists
 */
vendorRouter.put(
  "/:id",
  requirePermission("INVENTORY.VENDORS.UPDATE", paramLocator("VENDOR")),
  asyncHandler(vendorController.updateVendor),
);

/**
 * @swagger
 * /vendors/{id}:
 *   delete:
 *     summary: Delete a vendor
 *     tags: [Vendors]
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
 *         description: Vendor deleted successfully
 *       400:
 *         description: Cannot delete vendor with existing products
 *       404:
 *         description: Vendor not found
 */
vendorRouter.delete(
  "/:id",
  requirePermission("INVENTORY.VENDORS.DELETE", paramLocator("VENDOR")),
  asyncHandler(vendorController.deleteVendor),
);

export default vendorRouter;
