import { Request, Response } from "express";
import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
} from "@/utils/pagination";
import { getValidatedQuery } from "@/middlewares/validateRequest";
import { sendControllerError } from "@/utils/controllerError";

class InventoryController {
  // Get inventory for a specific location
  async getLocationInventory(req: Request, res: Response) {
    try {
      const { locationId } = req.params as { locationId: string };
      const query = getValidatedQuery<{
        page?: number;
        limit?: number;
        search?: string;
        categoryId?: string;
      }>(req, res);

      const { page, limit, search } = getPaginationParams(query);
      const { categoryId } = query;

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
        location: {
          id: location.id,
          name: location.name,
          type: location.type,
        },
        ...result,
      });
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "Get location inventory error",
      );
    }
  }

  // Get stock for a specific product across all locations
  async getProductStock(req: Request, res: Response) {
    try {
      const { productId } = req.params as { productId: string };

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
          subVariation: { select: { id: true, name: true } },
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
            subVariationId: item.subVariationId ?? undefined,
            subVariation: item.subVariation
              ? { id: item.subVariation.id, name: item.subVariation.name }
              : undefined,
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
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get product stock error");
    }
  }

  // Adjust inventory manually (admin/superAdmin)
  async adjustInventory(req: Request, res: Response) {
    try {
      const { locationId, variationId, subVariationId, quantity, reason } =
        req.body as {
          locationId: string;
          variationId: string;
          subVariationId?: string | null;
          quantity: number;
          reason?: string;
        };

      const adjustedQuantity = quantity;

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

      if (subVariationId) {
        const subVar = await prisma.productSubVariation.findFirst({
          where: { id: subVariationId, variationId },
        });
        if (!subVar) {
          return res.status(404).json({
            message:
              "Sub-variation not found or does not belong to this variation",
          });
        }
      }

      const uniqueKey = {
        locationId_variationId_subVariationId: {
          locationId,
          variationId,
          subVariationId: subVariationId || null,
        },
      };

      // Get or create inventory record
      const existingInventory = await prisma.locationInventory.findUnique({
        where: uniqueKey,
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
            subVariationId: subVariationId || null,
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
          subVariationId: inventory.subVariationId ?? undefined,
          previousQuantity,
          adjustmentAmount: adjustedQuantity,
          newQuantity: inventory.quantity,
          reason: reason || "Manual adjustment",
        },
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Adjust inventory error");
    }
  }

  // Set inventory quantity (admin/superAdmin) - absolute value
  async setInventory(req: Request, res: Response) {
    try {
      const {
        locationId,
        variationId,
        subVariationId,
        quantity: newQuantity,
      } = req.body as {
        locationId: string;
        variationId: string;
        subVariationId?: string | null;
        quantity: number;
      };

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

      if (subVariationId) {
        const subVar = await prisma.productSubVariation.findFirst({
          where: { id: subVariationId, variationId },
        });
        if (!subVar) {
          return res.status(404).json({
            message:
              "Sub-variation not found or does not belong to this variation",
          });
        }
      }

      // Upsert inventory record
      const inventory = await prisma.locationInventory.upsert({
        where: {
          locationId_variationId_subVariationId: {
            locationId,
            variationId,
            subVariationId: subVariationId || null,
          },
        },
        update: { quantity: newQuantity },
        create: {
          locationId,
          variationId,
          subVariationId: subVariationId || null,
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
          subVariationId: inventory.subVariationId ?? undefined,
          quantity: inventory.quantity,
        },
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Set inventory error");
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
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "Get inventory summary error",
      );
    }
  }
}

export default new InventoryController();
