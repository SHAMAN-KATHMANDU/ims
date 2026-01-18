import { Request, Response } from "express";
import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";

// Generate a unique sale code
function generateSaleCode(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SL-${dateStr}-${random}`;
}

class SaleController {
  // Create a new sale
  async createSale(req: Request, res: Response) {
    try {
      const { locationId, memberPhone, items, notes } = req.body;

      // Validate user
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Validate required fields
      if (!locationId) {
        return res.status(400).json({ message: "Location ID is required" });
      }
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res
          .status(400)
          .json({ message: "At least one item is required" });
      }

      // Validate location exists and is a showroom
      const location = await prisma.location.findUnique({
        where: { id: locationId },
      });

      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }

      if (!location.isActive) {
        return res.status(400).json({ message: "Location is inactive" });
      }

      if (location.type !== "SHOWROOM") {
        return res.status(400).json({
          message: "Sales can only be made at showrooms, not warehouses",
        });
      }

      // Check member if phone provided
      let member = null;
      let saleType: "GENERAL" | "MEMBER" = "GENERAL";

      if (memberPhone) {
        const normalizedPhone = memberPhone.replace(/[\s-]/g, "").trim();

        // Find or create member
        member = await prisma.member.findUnique({
          where: { phone: normalizedPhone },
        });

        if (!member) {
          // Auto-create member with phone
          member = await prisma.member.create({
            data: { phone: normalizedPhone },
          });
        }

        if (member.isActive) {
          saleType = "MEMBER";
        }
      }

      // Get "Member" discount type for member sales
      let memberDiscountType = null;
      if (saleType === "MEMBER") {
        memberDiscountType = await prisma.discountType.findUnique({
          where: { name: "Member" },
        });
      }

      // Process items and validate stock
      const processedItems: Array<{
        variationId: string;
        quantity: number;
        unitPrice: number;
        discountPercent: number;
        lineTotal: number;
      }> = [];

      let subtotal = 0;
      let totalDiscount = 0;

      for (const item of items) {
        if (!item.variationId || !item.quantity || item.quantity <= 0) {
          return res.status(400).json({
            message: "Each item must have a variationId and positive quantity",
          });
        }

        // Get variation with product info
        const variation = await prisma.productVariation.findUnique({
          where: { id: item.variationId },
          include: {
            product: {
              include: {
                discounts: {
                  where: {
                    isActive: true,
                    OR: [
                      { startDate: null },
                      { startDate: { lte: new Date() } },
                    ],
                    AND: [
                      {
                        OR: [
                          { endDate: null },
                          { endDate: { gte: new Date() } },
                        ],
                      },
                    ],
                  },
                  include: {
                    discountType: true,
                  },
                },
              },
            },
          },
        });

        if (!variation) {
          return res.status(404).json({
            message: `Product variation ${item.variationId} not found`,
          });
        }

        // Check stock at this location
        const inventory = await prisma.locationInventory.findUnique({
          where: {
            locationId_variationId: {
              locationId,
              variationId: item.variationId,
            },
          },
        });

        const availableStock = inventory?.quantity || 0;
        if (availableStock < item.quantity) {
          return res.status(400).json({
            message: `Insufficient stock for ${variation.product.name} (${variation.color})`,
            available: availableStock,
            requested: item.quantity,
          });
        }

        // Calculate price
        const unitPrice = Number(variation.product.mrp);
        let discountPercent = 0;

        // Apply member discount if applicable
        if (saleType === "MEMBER" && memberDiscountType) {
          const memberDiscount = variation.product.discounts.find(
            (d) => d.discountTypeId === memberDiscountType.id,
          );
          if (memberDiscount) {
            discountPercent = Number(memberDiscount.discountPercentage);
          }
        }

        const itemSubtotal = unitPrice * item.quantity;
        const itemDiscount = itemSubtotal * (discountPercent / 100);
        const lineTotal = itemSubtotal - itemDiscount;

        subtotal += itemSubtotal;
        totalDiscount += itemDiscount;

        processedItems.push({
          variationId: item.variationId,
          quantity: item.quantity,
          unitPrice,
          discountPercent,
          lineTotal,
        });
      }

      const total = subtotal - totalDiscount;

      // Create sale with items in a transaction
      const sale = await prisma.$transaction(async (tx) => {
        // Create the sale
        const newSale = await tx.sale.create({
          data: {
            saleCode: generateSaleCode(),
            type: saleType,
            locationId,
            memberId: member?.id || null,
            subtotal,
            discount: totalDiscount,
            total,
            notes: notes || null,
            createdById: req.user!.id,
            items: {
              create: processedItems.map((item) => ({
                variationId: item.variationId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discountPercent: item.discountPercent,
                lineTotal: item.lineTotal,
              })),
            },
          },
          include: {
            location: {
              select: { id: true, name: true },
            },
            member: {
              select: { id: true, phone: true, name: true },
            },
            createdBy: {
              select: { id: true, username: true },
            },
            items: {
              include: {
                variation: {
                  include: {
                    product: {
                      select: { id: true, name: true, imsCode: true },
                    },
                  },
                },
              },
            },
          },
        });

        // Deduct inventory for each item
        for (const item of processedItems) {
          await tx.locationInventory.update({
            where: {
              locationId_variationId: {
                locationId,
                variationId: item.variationId,
              },
            },
            data: {
              quantity: {
                decrement: item.quantity,
              },
            },
          });
        }

        return newSale;
      });

      res.status(201).json({
        message: "Sale created successfully",
        sale,
      });
    } catch (error: any) {
      console.error("Create sale error:", error);
      if (error.code === "P2002") {
        return res.status(500).json({
          message: "Error creating sale. Please try again.",
        });
      }
      res
        .status(500)
        .json({ message: "Error creating sale", error: error.message });
    }
  }

  // Get all sales with filtering
  async getAllSales(req: Request, res: Response) {
    try {
      const { page, limit, sortBy, sortOrder, search } = getPaginationParams(
        req.query,
      );

      // Parse filters
      const locationId = req.query.locationId as string | undefined;
      const type = req.query.type as "GENERAL" | "MEMBER" | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      // Allowed fields for sorting
      const allowedSortFields = [
        "id",
        "saleCode",
        "type",
        "total",
        "createdAt",
      ];

      // Get orderBy for Prisma
      const orderBy = getPrismaOrderBy(
        sortBy,
        sortOrder,
        allowedSortFields,
      ) || { createdAt: "desc" };

      // Build filter
      const where: any = {};

      if (locationId) {
        where.locationId = locationId;
      }

      if (type) {
        where.type = type;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          // Set to end of day
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          where.createdAt.lte = end;
        }
      }

      if (search) {
        where.OR = [
          { saleCode: { contains: search, mode: "insensitive" } },
          { member: { phone: { contains: search, mode: "insensitive" } } },
          { member: { name: { contains: search, mode: "insensitive" } } },
        ];
      }

      const skip = (page - 1) * limit;

      const [totalItems, sales] = await Promise.all([
        prisma.sale.count({ where }),
        prisma.sale.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            location: {
              select: { id: true, name: true },
            },
            member: {
              select: { id: true, phone: true, name: true },
            },
            createdBy: {
              select: { id: true, username: true },
            },
            _count: {
              select: { items: true },
            },
          },
        }),
      ]);

      const result = createPaginationResult(sales, totalItems, page, limit);

      res.status(200).json({
        message: "Sales fetched successfully",
        ...result,
      });
    } catch (error: any) {
      console.error("Get all sales error:", error);
      res
        .status(500)
        .json({ message: "Error fetching sales", error: error.message });
    }
  }

  // Get sale by ID with full details
  async getSaleById(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      const sale = await prisma.sale.findUnique({
        where: { id },
        include: {
          location: true,
          member: true,
          createdBy: {
            select: { id: true, username: true, role: true },
          },
          items: {
            include: {
              variation: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      imsCode: true,
                      category: true,
                    },
                  },
                  photos: {
                    where: { isPrimary: true },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      });

      if (!sale) {
        return res.status(404).json({ message: "Sale not found" });
      }

      res.status(200).json({
        message: "Sale fetched successfully",
        sale,
      });
    } catch (error: any) {
      console.error("Get sale by ID error:", error);
      res
        .status(500)
        .json({ message: "Error fetching sale", error: error.message });
    }
  }

  // Get sales summary for analytics
  async getSalesSummary(req: Request, res: Response) {
    try {
      const locationId = req.query.locationId as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      // Build date filter
      const dateFilter: any = {};
      if (startDate || endDate) {
        if (startDate) {
          dateFilter.gte = new Date(startDate);
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          dateFilter.lte = end;
        }
      }

      const where: any = {};
      if (locationId) {
        where.locationId = locationId;
      }
      if (Object.keys(dateFilter).length > 0) {
        where.createdAt = dateFilter;
      }

      // Get totals
      const [totalStats, generalStats, memberStats] = await Promise.all([
        prisma.sale.aggregate({
          where,
          _sum: { total: true, discount: true },
          _count: true,
        }),
        prisma.sale.aggregate({
          where: { ...where, type: "GENERAL" },
          _sum: { total: true },
          _count: true,
        }),
        prisma.sale.aggregate({
          where: { ...where, type: "MEMBER" },
          _sum: { total: true },
          _count: true,
        }),
      ]);

      res.status(200).json({
        message: "Sales summary fetched successfully",
        summary: {
          totalSales: totalStats._count,
          totalRevenue: Number(totalStats._sum.total) || 0,
          totalDiscount: Number(totalStats._sum.discount) || 0,
          generalSales: {
            count: generalStats._count,
            revenue: Number(generalStats._sum.total) || 0,
          },
          memberSales: {
            count: memberStats._count,
            revenue: Number(memberStats._sum.total) || 0,
          },
        },
      });
    } catch (error: any) {
      console.error("Get sales summary error:", error);
      res.status(500).json({
        message: "Error fetching sales summary",
        error: error.message,
      });
    }
  }

  // Get sales by location (for analytics)
  async getSalesByLocation(req: Request, res: Response) {
    try {
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      // Build date filter
      const dateFilter: any = {};
      if (startDate || endDate) {
        if (startDate) {
          dateFilter.gte = new Date(startDate);
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          dateFilter.lte = end;
        }
      }

      const where: any = {};
      if (Object.keys(dateFilter).length > 0) {
        where.createdAt = dateFilter;
      }

      // Get all showrooms
      const locations = await prisma.location.findMany({
        where: { type: "SHOWROOM", isActive: true },
        select: { id: true, name: true },
      });

      // Get sales stats per location
      const locationStats = await Promise.all(
        locations.map(async (location) => {
          const stats = await prisma.sale.aggregate({
            where: { ...where, locationId: location.id },
            _sum: { total: true },
            _count: true,
          });

          return {
            locationId: location.id,
            locationName: location.name,
            totalSales: stats._count,
            totalRevenue: Number(stats._sum.total) || 0,
          };
        }),
      );

      res.status(200).json({
        message: "Sales by location fetched successfully",
        data: locationStats,
      });
    } catch (error: any) {
      console.error("Get sales by location error:", error);
      res.status(500).json({
        message: "Error fetching sales by location",
        error: error.message,
      });
    }
  }

  // Get daily sales (for analytics chart)
  async getDailySales(req: Request, res: Response) {
    try {
      const locationId = req.query.locationId as string | undefined;
      const days = parseInt(req.query.days as string) || 30;

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const where: any = {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      };

      if (locationId) {
        where.locationId = locationId;
      }

      // Get all sales in the date range
      const sales = await prisma.sale.findMany({
        where,
        select: {
          total: true,
          type: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      });

      // Group by date
      const dailyData: Record<
        string,
        {
          date: string;
          total: number;
          count: number;
          general: number;
          member: number;
        }
      > = {};

      for (
        let d = new Date(startDate);
        d <= endDate;
        d.setDate(d.getDate() + 1)
      ) {
        const dateStr = d.toISOString().slice(0, 10);
        dailyData[dateStr] = {
          date: dateStr,
          total: 0,
          count: 0,
          general: 0,
          member: 0,
        };
      }

      for (const sale of sales) {
        const dateStr = sale.createdAt.toISOString().slice(0, 10);
        if (dailyData[dateStr]) {
          dailyData[dateStr].total += Number(sale.total);
          dailyData[dateStr].count += 1;
          if (sale.type === "GENERAL") {
            dailyData[dateStr].general += Number(sale.total);
          } else {
            dailyData[dateStr].member += Number(sale.total);
          }
        }
      }

      res.status(200).json({
        message: "Daily sales fetched successfully",
        data: Object.values(dailyData),
      });
    } catch (error: any) {
      console.error("Get daily sales error:", error);
      res
        .status(500)
        .json({ message: "Error fetching daily sales", error: error.message });
    }
  }
}

export default new SaleController();
