import { Request, Response } from "express";
import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";

class LocationController {
  // Create location (superAdmin only)
  async createLocation(req: Request, res: Response) {
    try {
      const { name, type, address, isDefaultWarehouse } = req.body;

      // Validate required fields
      if (!name) {
        return res.status(400).json({ message: "Location name is required" });
      }

      // Validate type if provided
      if (type && !["WAREHOUSE", "SHOWROOM"].includes(type)) {
        return res.status(400).json({
          message: "Invalid location type. Must be WAREHOUSE or SHOWROOM",
        });
      }

      // Check if location already exists
      const existingLocation = await prisma.location.findFirst({
        where: { name },
      });

      if (existingLocation) {
        return res
          .status(409)
          .json({ message: "Location with this name already exists" });
      }

      // If setting as default warehouse, unset any existing default
      if (isDefaultWarehouse === true) {
        await prisma.location.updateMany({
          where: { isDefaultWarehouse: true },
          data: { isDefaultWarehouse: false },
        });
      }

      const location = await prisma.location.create({
        data: {
          tenantId: req.user!.tenantId,
          name,
          type: type || "SHOWROOM",
          address: address || null,
          isDefaultWarehouse: isDefaultWarehouse === true,
        },
      });

      res.status(201).json({
        message: "Location created successfully",
        location,
      });
    } catch (error: any) {
      console.error("Create location error:", error);
      res
        .status(500)
        .json({ message: "Error creating location", error: error.message });
    }
  }

  // Get all locations (all authenticated users)
  async getAllLocations(req: Request, res: Response) {
    try {
      const { page, limit, sortBy, sortOrder, search } = getPaginationParams(
        req.query,
      );

      // Parse type and status filters from query
      const typeFilter = req.query.type as string | undefined;
      const activeOnly = req.query.activeOnly === "true";
      const statusFilter = req.query.status as string | undefined;

      // Allowed fields for sorting
      const allowedSortFields = [
        "id",
        "name",
        "type",
        "createdAt",
        "updatedAt",
      ];

      // Get orderBy for Prisma
      const orderBy = getPrismaOrderBy(
        sortBy,
        sortOrder,
        allowedSortFields,
      ) || {
        name: "asc",
      };

      // Build filter
      const where: any = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { address: { contains: search, mode: "insensitive" } },
        ];
      }

      if (typeFilter && ["WAREHOUSE", "SHOWROOM"].includes(typeFilter)) {
        where.type = typeFilter;
      }

      if (activeOnly || statusFilter === "active") {
        where.isActive = true;
      } else if (statusFilter === "inactive") {
        where.isActive = false;
      }

      // Calculate skip for pagination
      const skip = (page - 1) * limit;

      // Get total count and locations in parallel
      const [totalItems, locations] = await Promise.all([
        prisma.location.count({ where }),
        prisma.location.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            _count: {
              select: {
                inventory: true,
                transfersFrom: true,
                transfersTo: true,
              },
            },
          },
        }),
      ]);

      const result = createPaginationResult(locations, totalItems, page, limit);

      res.status(200).json({
        message: "Locations fetched successfully",
        ...result,
      });
    } catch (error: any) {
      console.error("Get all locations error:", error);
      res
        .status(500)
        .json({ message: "Error fetching locations", error: error.message });
    }
  }

  // Get location by ID (all authenticated users)
  async getLocationById(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      const location = await prisma.location.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              inventory: true,
              transfersFrom: true,
              transfersTo: true,
            },
          },
        },
      });

      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }

      res.status(200).json({
        message: "Location fetched successfully",
        location,
      });
    } catch (error: any) {
      console.error("Get location by ID error:", error);
      res
        .status(500)
        .json({ message: "Error fetching location", error: error.message });
    }
  }

  // Update location (superAdmin only)
  async updateLocation(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const { name, type, address, isActive, isDefaultWarehouse } = req.body;

      // Check if location exists
      const existingLocation = await prisma.location.findUnique({
        where: { id },
      });

      if (!existingLocation) {
        return res.status(404).json({ message: "Location not found" });
      }

      // Prepare update data
      const updateData: any = {};

      if (name !== undefined) {
        // Check if new name is already taken by another location
        if (name !== existingLocation.name) {
          const nameExists = await prisma.location.findFirst({
            where: { name },
          });

          if (nameExists) {
            return res
              .status(409)
              .json({ message: "Location name already taken" });
          }
        }
        updateData.name = name;
      }

      if (type !== undefined) {
        if (!["WAREHOUSE", "SHOWROOM"].includes(type)) {
          return res.status(400).json({
            message: "Invalid location type. Must be WAREHOUSE or SHOWROOM",
          });
        }
        updateData.type = type;
      }

      if (address !== undefined) {
        updateData.address = address || null;
      }

      if (isActive !== undefined) {
        // Warehouses: require at least one active warehouse at all times
        if (
          isActive === false &&
          existingLocation.type === "WAREHOUSE" &&
          existingLocation.isActive
        ) {
          const activeWarehouseCount = await prisma.location.count({
            where: { type: "WAREHOUSE", isActive: true },
          });
          if (activeWarehouseCount <= 1) {
            return res.status(400).json({
              message:
                "At least one warehouse must remain active. Please activate another warehouse before deactivating this one.",
            });
          }
        }
        updateData.isActive = isActive;
      }

      if (isDefaultWarehouse !== undefined) {
        updateData.isDefaultWarehouse = isDefaultWarehouse === true;
        // If setting this location as default warehouse, unset others
        if (isDefaultWarehouse === true) {
          await prisma.location.updateMany({
            where: { id: { not: id } },
            data: { isDefaultWarehouse: false },
          });
        }
      }

      const updatedLocation = await prisma.location.update({
        where: { id },
        data: updateData,
        include: {
          _count: {
            select: {
              inventory: true,
              transfersFrom: true,
              transfersTo: true,
            },
          },
        },
      });

      res.status(200).json({
        message: "Location updated successfully",
        location: updatedLocation,
      });
    } catch (error: any) {
      console.error("Update location error:", error);
      res
        .status(500)
        .json({ message: "Error updating location", error: error.message });
    }
  }

  // Delete location (superAdmin only) - soft delete by setting isActive to false
  async deleteLocation(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      // Check if location exists
      const existingLocation = await prisma.location.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              inventory: true,
              transfersFrom: { where: { status: { not: "COMPLETED" } } },
              transfersTo: { where: { status: { not: "COMPLETED" } } },
            },
          },
        },
      });

      if (!existingLocation) {
        return res.status(404).json({ message: "Location not found" });
      }

      // Check if there are pending transfers
      if (
        existingLocation._count.transfersFrom > 0 ||
        existingLocation._count.transfersTo > 0
      ) {
        return res.status(400).json({
          message:
            "Cannot delete location with pending transfers. Complete or cancel all transfers first.",
        });
      }

      // Warehouses: require at least one active warehouse at all times (soft delete = deactivate)
      if (existingLocation.type === "WAREHOUSE" && existingLocation.isActive) {
        const activeWarehouseCount = await prisma.location.count({
          where: { type: "WAREHOUSE", isActive: true },
        });
        if (activeWarehouseCount <= 1) {
          return res.status(400).json({
            message:
              "At least one warehouse must remain active. Please activate another warehouse before deactivating this one.",
          });
        }
      }

      // Soft delete - set isActive to false
      await prisma.location.update({
        where: { id },
        data: { isActive: false },
      });

      res.status(200).json({
        message: "Location deactivated successfully",
      });
    } catch (error: any) {
      console.error("Delete location error:", error);
      res
        .status(500)
        .json({ message: "Error deleting location", error: error.message });
    }
  }

  // Get location with inventory summary
  async getLocationInventory(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      const { page, limit, search } = getPaginationParams(req.query);

      const location = await prisma.location.findUnique({
        where: { id },
      });

      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }

      // Build search filter for inventory
      const where: any = { locationId: id };

      if (search) {
        where.variation = {
          OR: [
            { color: { contains: search, mode: "insensitive" } },
            {
              product: {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { imsCode: { contains: search, mode: "insensitive" } },
                ],
              },
            },
          ],
        };
      }

      const skip = (page - 1) * limit;

      const [totalItems, inventory] = await Promise.all([
        prisma.locationInventory.count({ where }),
        prisma.locationInventory.findMany({
          where,
          skip,
          take: limit,
          include: {
            variation: {
              include: {
                product: {
                  select: {
                    id: true,
                    imsCode: true,
                    name: true,
                    category: true,
                  },
                },
                photos: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
            subVariation: { select: { id: true, name: true } },
          },
          orderBy: {
            variation: {
              product: {
                name: "asc",
              },
            },
          },
        }),
      ]);

      const result = createPaginationResult(inventory, totalItems, page, limit);

      res.status(200).json({
        message: "Location inventory fetched successfully",
        location,
        ...result,
      });
    } catch (error: any) {
      console.error("Get location inventory error:", error);
      res.status(500).json({
        message: "Error fetching location inventory",
        error: error.message,
      });
    }
  }
}

export default new LocationController();
