import { Request, Response } from "express";
import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
} from "@/utils/pagination";

class InventoryController {
  // Get inventory for a specific location
  async getLocationInventory(req: Request, res: Response) {
    try {
      const locationId = Array.isArray(req.params.locationId)
        ? req.params.locationId[0]
        : req.params.locationId;

      const { page, limit, search } = getPaginationParams(req.query);
      const categoryId = req.query.categoryId as string | undefined;

      // Check if location exists
      const location = await prisma.location.findUnique({
        where: { id: locationId },
      });

      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }

      // Build filter
      const where: any = {
        locationId,
        quantity: { gt: 0 }, // Only show items with stock
      };

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

      if (categoryId) {
        where.variation = {
          ...where.variation,
          product: {
            ...where.variation?.product,
            categoryId,
          },
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
                    costPrice: true,
                    mrp: true,
                    category: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
                photos: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
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
        location: {
          id: location.id,
          name: location.name,
          type: location.type,
        },
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

  // Get stock for a specific product across all locations
  async getProductStock(req: Request, res: Response) {
    try {
      const productId = Array.isArray(req.params.productId)
        ? req.params.productId[0]
        : req.params.productId;

      // Check if product exists
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          category: true,
          variations: {
            select: {
              id: true,
              color: true,
              stockQuantity: true,
            },
          },
        },
      });

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Get inventory for all variations across all locations
      const inventory = await prisma.locationInventory.findMany({
        where: {
          variation: {
            productId,
          },
        },
        include: {
          location: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          variation: {
            select: {
              id: true,
              color: true,
            },
          },
        },
        orderBy: [
          { location: { type: "asc" } },
          { location: { name: "asc" } },
          { variation: { color: "asc" } },
        ],
      });

      // Group inventory by location
      const inventoryByLocation = inventory.reduce(
        (acc: Record<string, any>, item) => {
          const locationId = item.location.id;
          if (!acc[locationId]) {
            acc[locationId] = {
              location: item.location,
              variations: [],
              totalQuantity: 0,
            };
          }
          acc[locationId].variations.push({
            variationId: item.variation.id,
            color: item.variation.color,
            quantity: item.quantity,
          });
          acc[locationId].totalQuantity += item.quantity;
          return acc;
        },
        {},
      );

      // Calculate total stock across all locations
      const totalStock = inventory.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );

      res.status(200).json({
        message: "Product stock fetched successfully",
        product: {
          id: product.id,
          imsCode: product.imsCode,
          name: product.name,
          category: product.category,
        },
        totalStock,
        inventoryByLocation: Object.values(inventoryByLocation),
      });
    } catch (error: any) {
      console.error("Get product stock error:", error);
      res.status(500).json({
        message: "Error fetching product stock",
        error: error.message,
      });
    }
  }

  // Adjust inventory manually (admin/superAdmin)
  async adjustInventory(req: Request, res: Response) {
    try {
      const { locationId, variationId, quantity, reason } = req.body;

      // Validate required fields
      if (!locationId) {
        return res.status(400).json({ message: "Location ID is required" });
      }
      if (!variationId) {
        return res.status(400).json({ message: "Variation ID is required" });
      }
      if (quantity === undefined || quantity === null) {
        return res.status(400).json({ message: "Quantity is required" });
      }

      const adjustedQuantity = parseInt(quantity);
      if (isNaN(adjustedQuantity)) {
        return res.status(400).json({ message: "Quantity must be a number" });
      }

      // Check if location exists
      const location = await prisma.location.findUnique({
        where: { id: locationId },
      });

      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }

      // Check if variation exists
      const variation = await prisma.productVariation.findUnique({
        where: { id: variationId },
        include: {
          product: {
            select: {
              id: true,
              imsCode: true,
              name: true,
            },
          },
        },
      });

      if (!variation) {
        return res.status(404).json({ message: "Product variation not found" });
      }

      // Get or create inventory record
      const existingInventory = await prisma.locationInventory.findUnique({
        where: {
          locationId_variationId: {
            locationId,
            variationId,
          },
        },
      });

      let inventory;
      let previousQuantity = 0;

      if (existingInventory) {
        previousQuantity = existingInventory.quantity;

        // Check if resulting quantity would be negative
        const newQuantity = existingInventory.quantity + adjustedQuantity;
        if (newQuantity < 0) {
          return res.status(400).json({
            message: "Adjustment would result in negative inventory",
            currentQuantity: existingInventory.quantity,
            adjustmentAmount: adjustedQuantity,
          });
        }

        inventory = await prisma.locationInventory.update({
          where: { id: existingInventory.id },
          data: { quantity: newQuantity },
        });
      } else {
        // Create new inventory record
        if (adjustedQuantity < 0) {
          return res.status(400).json({
            message: "Cannot create inventory with negative quantity",
          });
        }

        inventory = await prisma.locationInventory.create({
          data: {
            locationId,
            variationId,
            quantity: adjustedQuantity,
          },
        });
      }

      res.status(200).json({
        message: "Inventory adjusted successfully",
        adjustment: {
          locationId,
          locationName: location.name,
          product: variation.product,
          color: variation.color,
          previousQuantity,
          adjustmentAmount: adjustedQuantity,
          newQuantity: inventory.quantity,
          reason: reason || "Manual adjustment",
        },
      });
    } catch (error: any) {
      console.error("Adjust inventory error:", error);
      res.status(500).json({
        message: "Error adjusting inventory",
        error: error.message,
      });
    }
  }

  // Set inventory quantity (admin/superAdmin) - absolute value
  async setInventory(req: Request, res: Response) {
    try {
      const { locationId, variationId, quantity } = req.body;

      // Validate required fields
      if (!locationId) {
        return res.status(400).json({ message: "Location ID is required" });
      }
      if (!variationId) {
        return res.status(400).json({ message: "Variation ID is required" });
      }
      if (quantity === undefined || quantity === null) {
        return res.status(400).json({ message: "Quantity is required" });
      }

      const newQuantity = parseInt(quantity);
      if (isNaN(newQuantity) || newQuantity < 0) {
        return res
          .status(400)
          .json({ message: "Quantity must be a non-negative number" });
      }

      // Check if location exists
      const location = await prisma.location.findUnique({
        where: { id: locationId },
      });

      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }

      // Check if variation exists
      const variation = await prisma.productVariation.findUnique({
        where: { id: variationId },
        include: {
          product: {
            select: {
              id: true,
              imsCode: true,
              name: true,
            },
          },
        },
      });

      if (!variation) {
        return res.status(404).json({ message: "Product variation not found" });
      }

      // Upsert inventory record
      const inventory = await prisma.locationInventory.upsert({
        where: {
          locationId_variationId: {
            locationId,
            variationId,
          },
        },
        update: { quantity: newQuantity },
        create: {
          locationId,
          variationId,
          quantity: newQuantity,
        },
      });

      res.status(200).json({
        message: "Inventory set successfully",
        inventory: {
          id: inventory.id,
          locationId,
          locationName: location.name,
          product: variation.product,
          color: variation.color,
          quantity: inventory.quantity,
        },
      });
    } catch (error: any) {
      console.error("Set inventory error:", error);
      res.status(500).json({
        message: "Error setting inventory",
        error: error.message,
      });
    }
  }

  // Get inventory summary across all locations
  async getInventorySummary(req: Request, res: Response) {
    try {
      // Get all locations with inventory counts
      const locations = await prisma.location.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: {
              inventory: true,
            },
          },
        },
        orderBy: [{ type: "asc" }, { name: "asc" }],
      });

      // Get total quantities per location
      const locationStats = await Promise.all(
        locations.map(async (location) => {
          const stats = await prisma.locationInventory.aggregate({
            where: { locationId: location.id },
            _sum: { quantity: true },
            _count: true,
          });

          return {
            id: location.id,
            name: location.name,
            type: location.type,
            totalItems: stats._count,
            totalQuantity: stats._sum.quantity || 0,
          };
        }),
      );

      // Calculate overall totals
      const overallTotal = locationStats.reduce(
        (acc, loc) => ({
          totalItems: acc.totalItems + loc.totalItems,
          totalQuantity: acc.totalQuantity + loc.totalQuantity,
        }),
        { totalItems: 0, totalQuantity: 0 },
      );

      res.status(200).json({
        message: "Inventory summary fetched successfully",
        summary: {
          totalLocations: locations.length,
          ...overallTotal,
        },
        locationStats,
      });
    } catch (error: any) {
      console.error("Get inventory summary error:", error);
      res.status(500).json({
        message: "Error fetching inventory summary",
        error: error.message,
      });
    }
  }
}

export default new InventoryController();
