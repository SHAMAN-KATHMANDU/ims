import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import vendorController from "@/modules/vendors/vendor.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const vendorRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Vendors
 *   description: Vendor management
 */

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
  authorizeRoles("admin", "superAdmin"),
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
 *     responses:
 *       200:
 *         description: Vendors retrieved successfully
 */
vendorRouter.get(
  "/",
  authorizeRoles("admin", "user", "superAdmin"),
  asyncHandler(vendorController.getAllVendors),
);

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
 *     responses:
 *       200:
 *         description: Vendor products retrieved successfully
 *       404:
 *         description: Vendor not found
 */
vendorRouter.get(
  "/:id/products",
  authorizeRoles("admin", "user", "superAdmin"),
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
  authorizeRoles("admin", "user", "superAdmin"),
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
  authorizeRoles("admin", "superAdmin"),
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
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(vendorController.deleteVendor),
);

export default vendorRouter;
