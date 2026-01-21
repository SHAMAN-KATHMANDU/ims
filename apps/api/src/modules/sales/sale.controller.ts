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
      const {
        locationId,
        memberPhone,
        items,
        notes,
        payments,
      }: {
        locationId: string;
        memberPhone?: string;
        items: Array<{
          variationId: string;
          quantity: number;
          promoCode?: string;
        }>;
        notes?: string;
        payments?: Array<{
          method: "CASH" | "CARD" | "CHEQUE" | "FONEPAY" | "QR";
          amount: number;
        }>;
      } = req.body;

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

      // Process items and validate stock & discounts
      const processedItems: Array<{
        variationId: string;
        quantity: number;
        unitPrice: number;
        totalMrp: number;
        discountPercent: number;
        discountAmount: number;
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

        // Get variation with product info and active discounts
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

        // Base price is current MRP / final selling price
        const unitPrice = Number(variation.product.mrp);
        const itemSubtotal = unitPrice * item.quantity;
        let discountPercent = 0;
        let discountAmount = 0;

        // Determine base product discount based on sale type (member / non-member / wholesale)
        const activeDiscounts = variation.product.discounts;
        let baseDiscount:
          | ((typeof activeDiscounts)[number] & {
              discountType: { name: string };
            })
          | null = null;

        // Helper to choose the highest-priority discount
        if (activeDiscounts && activeDiscounts.length > 0) {
          // Prioritise "Special", then by highest effective value
          const withTypes = activeDiscounts as Array<
            (typeof activeDiscounts)[number] & {
              discountType: { name: string };
            }
          >;

          const eligible = withTypes.filter((d) => {
            const typeName = d.discountType.name.toLowerCase();
            if (saleType === "MEMBER") {
              return (
                typeName.includes("member") ||
                typeName.includes("normal") ||
                typeName.includes("non-member")
              );
            }
            // Non-member sale
            return (
              typeName.includes("normal") ||
              typeName.includes("non-member") ||
              typeName.includes("wholesale")
            );
          });

          if (eligible.length > 0) {
            eligible.sort((a, b) => {
              const aIsSpecial =
                a.discountType.name.toLowerCase() === "special" ? 1 : 0;
              const bIsSpecial =
                b.discountType.name.toLowerCase() === "special" ? 1 : 0;

              if (aIsSpecial !== bIsSpecial) {
                return bIsSpecial - aIsSpecial;
              }

              // Compare effective discount value (percentage vs flat)
              const aValue =
                a.valueType === "FLAT"
                  ? Number(a.value)
                  : (Number(a.value) / 100) * itemSubtotal;
              const bValue =
                b.valueType === "FLAT"
                  ? Number(b.value)
                  : (Number(b.value) / 100) * itemSubtotal;

              return bValue - aValue;
            });

            baseDiscount = eligible[0];
          }
        }

        if (baseDiscount) {
          if (baseDiscount.valueType === "FLAT") {
            discountAmount += Number(baseDiscount.value);
          } else {
            discountPercent += Number(baseDiscount.value);
          }
        }

        // Apply promo code logic (per product, processed after base discounts)
        if (item.promoCode) {
          const promo = await prisma.promoCode.findUnique({
            where: { code: item.promoCode },
            include: {
              products: {
                include: { product: true },
              },
            },
          });

          if (promo && promo.isActive) {
            const now = new Date();
            if (
              (!promo.validFrom || promo.validFrom <= now) &&
              (!promo.validTo || promo.validTo >= now) &&
              (!promo.usageLimit || promo.usageCount < promo.usageLimit)
            ) {
              const isProductEligible = promo.products.some(
                (pp) => pp.productId === variation.productId,
              );

              let isCustomerEligible = false;
              if (promo.eligibility === "ALL") {
                isCustomerEligible = true;
              } else if (promo.eligibility === "MEMBER") {
                isCustomerEligible = saleType === "MEMBER";
              } else if (promo.eligibility === "NON_MEMBER") {
                isCustomerEligible = saleType === "GENERAL";
              } else if (promo.eligibility === "WHOLESALE") {
                // Placeholder for future wholesale logic
                isCustomerEligible = false;
              }

              if (isProductEligible && isCustomerEligible) {
                const baseAfterProductDiscount =
                  itemSubtotal -
                  (discountAmount + itemSubtotal * (discountPercent / 100));

                let promoDiscountAmount = 0;
                if (promo.valueType === "FLAT") {
                  promoDiscountAmount = Number(promo.value);
                } else {
                  promoDiscountAmount =
                    baseAfterProductDiscount * (Number(promo.value) / 100);
                }

                if (promo.overrideDiscounts) {
                  // Promo overrides existing discounts
                  discountAmount = promoDiscountAmount;
                  discountPercent = 0;
                } else if (promo.allowStacking) {
                  // Promo stacks on top of existing discounts
                  discountAmount += promoDiscountAmount;
                } else {
                  // Default behaviour: choose the better of base vs promo
                  const baseTotalDiscount =
                    discountAmount + itemSubtotal * (discountPercent / 100);
                  if (promoDiscountAmount > baseTotalDiscount) {
                    discountAmount = promoDiscountAmount;
                    discountPercent = 0;
                  }
                }

                // Increment promo usage
                await prisma.promoCode.update({
                  where: { id: promo.id },
                  data: {
                    usageCount: {
                      increment: 1,
                    },
                  },
                });
              }
            }
          }
        }

        // Clamp discounts so they never exceed subtotal
        const effectiveDiscount =
          Math.min(
            itemSubtotal,
            discountAmount + itemSubtotal * (discountPercent / 100),
          ) || 0;
        const lineTotal = itemSubtotal - effectiveDiscount;

        subtotal += itemSubtotal;
        totalDiscount += effectiveDiscount;

        processedItems.push({
          variationId: item.variationId,
          quantity: item.quantity,
          unitPrice,
          totalMrp: itemSubtotal,
          discountPercent,
          discountAmount: effectiveDiscount,
          lineTotal,
        });
      }

      const total = subtotal - totalDiscount;

      // Optional: validate payment breakdown matches total
      if (payments && payments.length > 0) {
        const paymentSum = payments.reduce(
          (sum, p) => sum + Number(p.amount || 0),
          0,
        );
        // Allow small floating point tolerance
        if (Math.abs(paymentSum - total) > 0.01) {
          return res.status(400).json({
            message:
              "Sum of payment sources must match final total (after discounts)",
            total,
            paymentSum,
          });
        }
      }

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
                totalMrp: item.totalMrp,
                discountPercent: item.discountPercent,
                discountAmount: item.discountAmount,
                lineTotal: item.lineTotal,
              })),
            },
            payments:
              payments && payments.length > 0
                ? {
                    create: payments.map((p) => ({
                      method: p.method,
                      amount: p.amount,
                    })),
                  }
                : undefined,
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
            payments: true,
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

        // Update member aggregation fields if this is a member sale
        if (member) {
          await tx.member.update({
            where: { id: member.id },
            data: {
              totalSales: {
                increment: total,
              },
              memberSince: member.createdAt ?? new Date(),
              firstPurchase: member.firstPurchase ?? new Date(),
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
