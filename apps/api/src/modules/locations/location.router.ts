import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { enforcePlanLimits } from "@/middlewares/enforcePlanLimits";
import locationController from "@/modules/locations/location.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const locationRouter = Router();

/**
 * @swagger
 * /locations:
 *   post:
 *     summary: Create a new location (warehouse or showroom)
 *     tags: [Locations]
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
 *                 example: Main Warehouse
 *               type:
 *                 type: string
 *                 enum: [WAREHOUSE, SHOWROOM]
 *                 example: WAREHOUSE
 *               address:
 *                 type: string
 *                 example: 123 Industrial Area
 *     responses:
 *       201:
 *         description: Location created successfully
 *       400:
 *         description: Bad request
 *       409:
 *         description: Location already exists
 */
locationRouter.post(
  "/",
  authorizeRoles("admin", "superAdmin"),
  enforcePlanLimits("locations"),
  asyncHandler(locationController.createLocation),
);

/**
 * @swagger
 * /locations:
 *   get:
 *     summary: Get all locations
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [WAREHOUSE, SHOWROOM]
 *         description: Filter by location type
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *         description: Filter only active locations
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Locations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedLocationsResponse'
 */
locationRouter.get(
  "/",
  authorizeRoles("admin", "user", "superAdmin"),
  asyncHandler(locationController.getAllLocations),
);

/**
 * @swagger
 * /locations/{id}:
 *   get:
 *     summary: Get location by ID
 *     tags: [Locations]
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
 *         description: Location retrieved successfully
 *       404:
 *         description: Location not found
 */
locationRouter.get(
  "/:id",
  authorizeRoles("admin", "user", "superAdmin"),
  asyncHandler(locationController.getLocationById),
);

/**
 * @swagger
 * /locations/{id}/inventory:
 *   get:
 *     summary: Get location inventory
 *     tags: [Locations]
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
 *         description: Location inventory retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedInventoryResponse'
 *       404:
 *         description: Location not found
 */
locationRouter.get(
  "/:id/inventory",
  authorizeRoles("admin", "user", "superAdmin"),
  asyncHandler(locationController.getLocationInventory),
);

/**
 * @swagger
 * /locations/{id}:
 *   put:
 *     summary: Update a location
 *     tags: [Locations]
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
 *               type:
 *                 type: string
 *                 enum: [WAREHOUSE, SHOWROOM]
 *               address:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Location updated successfully
 *       404:
 *         description: Location not found
 */
locationRouter.put(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(locationController.updateLocation),
);

/**
 * @swagger
 * /locations/{id}:
 *   delete:
 *     summary: Deactivate a location (soft delete)
 *     tags: [Locations]
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
 *         description: Location deactivated successfully
 *       404:
 *         description: Location not found
 *       400:
 *         description: Cannot delete location with pending transfers
 */
locationRouter.delete(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(locationController.deleteLocation),
);

export default locationRouter;
