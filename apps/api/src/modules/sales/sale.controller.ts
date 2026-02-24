import { Request, Response } from "express";
import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import ExcelJS from "exceljs";
import fs from "fs";
import type { ExcelSaleRow } from "./bulkUpload.validation";
import { getSaleBulkParseOptions } from "./bulkUpload.validation";
import {
  processSaleBulkRows,
  buildSaleBulkTemplate,
} from "./sale.bulk.service";
import { parseBulkFile, type ValidationError } from "@/utils/bulkParse";
import { calculateSaleItems, SaleCalculationError } from "./sale.service";
import { sendControllerError } from "@/utils/controllerError";

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
        memberName,
        isCreditSale,
        items,
        notes,
        payments,
      }: {
        locationId: string;
        memberPhone?: string;
        memberName?: string;
        isCreditSale?: boolean;
        items: Array<{
          variationId: string;
          subVariationId?: string | null;
          quantity: number;
          discountId?: string | null;
          promoCode?: string;
        }>;
        notes?: string;
        payments?: Array<{
          method: "CASH" | "CARD" | "CHEQUE" | "FONEPAY" | "QR";
          amount: number;
        }>;
      } = req.body;

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
        member = await prisma.member.findFirst({
          where: { phone: normalizedPhone },
        });

        if (!member) {
          // Auto-create member with phone and optional name
          member = await prisma.member.create({
            data: {
              tenantId: req.user!.tenantId,
              phone: normalizedPhone,
              name: memberName?.trim() || null,
            },
          });
        }

        if (member.isActive) {
          saleType = "MEMBER";
        }
      }

      // Credit sales require a customer (member)
      if (isCreditSale === true && !member) {
        return res.status(400).json({
          message:
            "Credit sales require a customer (member). Please enter the customer's phone number.",
        });
      }

      // Calculate all item prices, discounts, and promo codes
      const { processedItems, subtotal, totalDiscount, total } =
        await calculateSaleItems(
          items,
          locationId,
          saleType,
          req.user!.tenantId,
        );

      // Increment promo usage counts (service is read-only; writes happen here)
      const promoCodesUsed = new Set<string>();
      for (const item of items) {
        if (item.promoCode && !promoCodesUsed.has(item.promoCode)) {
          const promo = await prisma.promoCode.findFirst({
            where: {
              tenantId: req.user!.tenantId,
              code: item.promoCode,
              isActive: true,
            },
          });
          if (promo) {
            await prisma.promoCode.update({
              where: { id: promo.id },
              data: { usageCount: { increment: 1 } },
            });
            promoCodesUsed.add(item.promoCode);
          }
        }
      }

      const creditSale = isCreditSale === true;

      // For non-credit sales: validate payment breakdown matches total
      if (!creditSale && payments && payments.length > 0) {
        const paymentSum =
          Math.round(
            payments.reduce((sum, p) => sum + Number(p.amount || 0), 0) * 100,
          ) / 100;
        // Allow small floating point tolerance (1 cent)
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
            tenantId: req.user!.tenantId,
            saleCode: generateSaleCode(),
            type: saleType,
            isCreditSale: creditSale,
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
                subVariationId: item.subVariationId ?? undefined,
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
                      select: { id: true, name: true },
                    },
                    attributes: {
                      include: {
                        attributeType: { select: { name: true } },
                        attributeValue: { select: { value: true } },
                      },
                    },
                  },
                },
                subVariation: { select: { id: true, name: true } },
              },
            },
            payments: true,
          },
        });

        // Deduct inventory for each item (variation-level or sub-variant level)
        // findFirst when subVariationId is null (Prisma compound unique does not accept null)
        for (const item of processedItems) {
          const inv =
            item.subVariationId != null
              ? await tx.locationInventory.findUnique({
                  where: {
                    locationId_variationId_subVariationId: {
                      locationId,
                      variationId: item.variationId,
                      subVariationId: item.subVariationId,
                    },
                  },
                })
              : await tx.locationInventory.findFirst({
                  where: {
                    locationId,
                    variationId: item.variationId,
                    subVariationId: null,
                  },
                });
          if (!inv) {
            throw new Error(
              `Inventory not found for location ${locationId}, variation ${item.variationId}`,
            );
          }
          await tx.locationInventory.update({
            where: { id: inv.id },
            data: {
              quantity: { decrement: item.quantity },
            },
          });
        }

        return newSale;
      });

      // Update member aggregation fields if this is a member sale
      // Done outside transaction to prevent sale creation failure if member update fails
      if (member) {
        try {
          await prisma.member.update({
            where: { id: member.id },
            data: {
              totalSales: {
                increment: total,
              },
              memberSince: member.createdAt ?? new Date(),
              firstPurchase: member.firstPurchase ?? new Date(),
            },
          });
        } catch (error) {
          // Log error but don't fail the sale creation
          console.error("Failed to update member aggregation fields:", error);
        }
      }

      // Audit log: CREATE_SALE
      try {
        await prisma.auditLog.create({
          data: {
            tenantId: req.user?.tenantId || null,
            userId: req.user!.id,
            action: "CREATE_SALE",
            resource: "sale",
            resourceId: sale.id,
            details: {
              saleCode: sale.saleCode,
              total: Number(sale.total),
              locationId: sale.locationId,
            },
            ip:
              (req as any).ip ??
              (req.socket as any)?.remoteAddress ??
              undefined,
            userAgent: req.get("user-agent") ?? undefined,
          },
        });
      } catch (auditErr) {
        console.error("Audit log CREATE_SALE failed:", auditErr);
      }

      res.status(201).json({
        message: "Sale created successfully",
        sale,
      });
    } catch (error: unknown) {
      if (error instanceof SaleCalculationError) {
        return res
          .status(error.status)
          .json({ message: error.message, ...error.extra });
      }
      return sendControllerError(req, res, error, "Create sale error");
    }
  }

  /**
   * Preview sale total (same discount + promo logic as createSale, no DB writes).
   * Use so frontend can show exact total and validate payment.
   */
  async previewSale(req: Request, res: Response) {
    try {
      const {
        locationId,
        memberPhone,
        items,
      }: {
        locationId: string;
        memberPhone?: string;
        items: Array<{
          variationId: string;
          subVariationId?: string | null;
          quantity: number;
          discountId?: string | null;
          promoCode?: string;
        }>;
      } = req.body;

      if (
        !locationId ||
        !items ||
        !Array.isArray(items) ||
        items.length === 0
      ) {
        return res.status(400).json({
          message: "locationId and items (non-empty array) are required",
        });
      }

      const location = await prisma.location.findUnique({
        where: { id: locationId },
      });
      if (!location || !location.isActive || location.type !== "SHOWROOM") {
        return res
          .status(400)
          .json({ message: "Invalid or inactive showroom" });
      }

      let saleType: "GENERAL" | "MEMBER" = "GENERAL";
      if (memberPhone) {
        const normalizedPhone = String(memberPhone)
          .replace(/[\s-]/g, "")
          .trim();
        const member = await prisma.member.findFirst({
          where: { phone: normalizedPhone },
          select: { id: true, isActive: true },
        });
        if (member?.isActive) saleType = "MEMBER";
      }

      const { subtotal, totalDiscount, totalPromoDiscount, total } =
        await calculateSaleItems(
          items,
          locationId,
          saleType,
          req.user!.tenantId,
        );

      res.json({
        subtotal,
        discount: totalDiscount,
        total,
        promoDiscount: totalPromoDiscount,
      });
    } catch (error: unknown) {
      if (error instanceof SaleCalculationError) {
        return res
          .status(error.status)
          .json({ message: error.message, ...error.extra });
      }
      return sendControllerError(req, res, error, "Preview sale error");
    }
  }

  // Get all sales with filtering
  async getAllSales(req: Request, res: Response) {
    try {
      const { page, limit, sortBy, sortOrder, search } = getPaginationParams(
        req.query,
      );

      // Parse filters (createdById used for analytics drill-down; user role ignores it and sees only own)
      const locationId = req.query.locationId as string | undefined;
      const createdByIdParam = req.query.createdById as string | undefined;
      const type = req.query.type as "GENERAL" | "MEMBER" | undefined;
      const isCreditSaleParam = req.query.isCreditSale as string | undefined;
      let startDate = req.query.startDate as string | undefined;
      let endDate = req.query.endDate as string | undefined;

      // For role "user", restrict date range to today and yesterday only
      const userRole = (req as any).user?.role as string | undefined;
      if (userRole === "user") {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const yesterdayStart = new Date(today);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        yesterdayStart.setHours(0, 0, 0, 0);
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date(yesterdayStart);
        yesterdayEnd.setHours(23, 59, 59, 999);
        // Clamp: if no dates provided, default to today
        if (!startDate && !endDate) {
          startDate = todayStart.toISOString().slice(0, 10);
          endDate = today.toISOString().slice(0, 10);
        } else {
          const reqStart = startDate ? new Date(startDate) : yesterdayStart;
          const reqEnd = endDate ? new Date(endDate) : today;
          if (reqStart < yesterdayStart)
            startDate = yesterdayStart.toISOString().slice(0, 10);
          if (reqEnd > today) endDate = today.toISOString().slice(0, 10);
        }
      }

      // Allowed fields for sorting (date added = createdAt, total cost = total)
      const allowedSortFields = [
        "createdAt", // date added
        "total", // total cost
        "subtotal",
        "discount",
        "saleCode",
        "type",
        "id",
      ];

      // Get orderBy for Prisma (sortOrder: asc | desc)
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

      if (isCreditSaleParam === "true") {
        where.isCreditSale = true;
      } else if (isCreditSaleParam === "false") {
        where.isCreditSale = false;
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

      if (userRole === "user" && (req as any).user?.id) {
        where.createdById = (req as any).user.id;
      } else if (createdByIdParam) {
        where.createdById = createdByIdParam;
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
            payments: {
              select: { method: true, amount: true },
              take: 1, // Get first payment for method display
              orderBy: { createdAt: "asc" },
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
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get all sales error");
    }
  }

  // Get current user's sales since last login (for User Sales Report)
  async getSalesSinceLastLogin(req: Request, res: Response) {
    try {
      const { page, limit } = getPaginationParams(req.query);

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { lastLoginAt: true },
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const since = user.lastLoginAt ?? new Date(0); // If never logged in, show all

      const where = {
        createdById: req.user.id,
        createdAt: { gte: since },
      };

      const skip = (page - 1) * limit;
      const [totalItems, sales] = await Promise.all([
        prisma.sale.count({ where }),
        prisma.sale.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            location: { select: { id: true, name: true } },
            member: { select: { id: true, phone: true, name: true } },
            createdBy: { select: { id: true, username: true } },
            payments: {
              select: { method: true, amount: true },
              take: 1,
              orderBy: { createdAt: "asc" },
            },
            _count: { select: { items: true } },
          },
        }),
      ]);

      const result = createPaginationResult(sales, totalItems, page, limit);

      res.status(200).json({
        message: "Sales since last login",
        ...result,
      });
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "Get sales since last login error",
      );
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
          payments: {
            select: {
              id: true,
              method: true,
              amount: true,
              createdAt: true,
            },
            orderBy: { createdAt: "asc" },
          },
          items: {
            include: {
              variation: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      category: true,
                    },
                  },
                  attributes: {
                    include: {
                      attributeType: { select: { name: true } },
                      attributeValue: { select: { value: true } },
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
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get sale by ID error");
    }
  }

  // Add payment to a credit sale
  async addPayment(req: Request, res: Response) {
    try {
      const saleId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const { method, amount }: { method: string; amount: number } = req.body;

      if (!saleId) {
        return res.status(400).json({ message: "Sale ID is required" });
      }
      if (
        !method ||
        !["CASH", "CARD", "CHEQUE", "FONEPAY", "QR"].includes(method)
      ) {
        return res.status(400).json({
          message:
            "Valid payment method is required (CASH, CARD, CHEQUE, FONEPAY, QR)",
        });
      }
      const amountNum = Number(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return res.status(400).json({
          message: "Amount must be a positive number",
        });
      }

      const sale = await prisma.sale.findUnique({
        where: { id: saleId },
        include: {
          payments: { select: { amount: true } },
        },
      });

      if (!sale) {
        return res.status(404).json({ message: "Sale not found" });
      }
      if (!sale.isCreditSale) {
        return res.status(400).json({
          message: "Payments can only be added to credit sales",
        });
      }

      const amountPaid =
        sale.payments.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const totalNum = Number(sale.total);
      const balanceDue = Math.round((totalNum - amountPaid) * 100) / 100;

      if (amountNum > balanceDue + 0.01) {
        return res.status(400).json({
          message: "Payment amount exceeds balance due",
          balanceDue,
        });
      }

      const payment = await prisma.salePayment.create({
        data: {
          saleId: sale.id,
          method: method as "CASH" | "CARD" | "CHEQUE" | "FONEPAY" | "QR",
          amount: amountNum,
        },
      });

      const updatedSale = await prisma.sale.findUnique({
        where: { id: saleId },
        include: {
          location: { select: { id: true, name: true } },
          member: { select: { id: true, phone: true, name: true } },
          createdBy: { select: { id: true, username: true, role: true } },
          payments: {
            select: { id: true, method: true, amount: true, createdAt: true },
            orderBy: { createdAt: "asc" },
          },
          items: {
            include: {
              variation: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      category: true,
                    },
                  },
                  attributes: {
                    include: {
                      attributeType: { select: { name: true } },
                      attributeValue: { select: { value: true } },
                    },
                  },
                  photos: { where: { isPrimary: true }, take: 1 },
                },
              },
            },
          },
        },
      });

      res.status(201).json({
        message: "Payment added successfully",
        sale: updatedSale,
        payment,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Add payment error");
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
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get sales summary error");
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
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "Get sales by location error",
      );
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
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get daily sales error");
    }
  }

  // Bulk upload sales from Excel or CSV file
  async bulkUploadSales(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "No file uploaded",
          summary: { total: 0, created: 0, skipped: 0, errors: 0 },
          created: [],
          skipped: [],
          errors: [],
        });
      }

      let parseResult: { rows: ExcelSaleRow[]; errors: ValidationError[] };
      try {
        parseResult = await parseBulkFile<ExcelSaleRow>(
          req.file.path,
          req.file.originalname,
          getSaleBulkParseOptions(),
        );
      } catch (err: unknown) {
        const e = err as { status?: number; body?: unknown };
        if (e?.status != null && e?.body != null) {
          return res.status(e.status).json(e.body);
        }
        throw err;
      }

      const { rows, errors: parseErrors } = parseResult;
      const tenantId = req.user!.tenantId;

      const processResult = await processSaleBulkRows(rows, { tenantId });

      const allErrors = [...parseErrors, ...processResult.errors];

      try {
        if (req.file?.path) fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error("Error cleaning up file:", e);
      }

      const total = processResult.created.length + processResult.skipped.length;
      res.status(200).json({
        message: "Bulk upload completed",
        summary: {
          total,
          created: processResult.created.length,
          skipped: processResult.skipped.length,
          errors: allErrors.length,
        },
        created: processResult.created,
        skipped: processResult.skipped,
        errors: allErrors,
      });
    } catch (error: unknown) {
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.error("Error cleaning up file:", e);
        }
      }
      return sendControllerError(req, res, error, "Bulk upload sales error");
    }
  }

  // Download bulk upload template (headers only)
  async downloadBulkUploadTemplate(req: Request, res: Response) {
    try {
      const buffer = await buildSaleBulkTemplate();
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="sales_bulk_upload_template.xlsx"',
      );
      res.send(buffer);
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Download template error");
    }
  }

  // Download sales as Excel or CSV
  async downloadSales(req: Request, res: Response) {
    try {
      const format = (req.query.format as string)?.toLowerCase() || "excel";
      const idsParam = req.query.ids as string | undefined;

      // Validate format
      if (format !== "excel" && format !== "csv") {
        return res.status(400).json({
          message: "Invalid format. Supported formats: excel, csv",
        });
      }

      // Parse sale IDs from query string
      let saleIds: string[] | undefined;
      if (idsParam) {
        saleIds = idsParam
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
      }

      // Build where clause
      const where: any = {};
      if (saleIds && saleIds.length > 0) {
        where.id = { in: saleIds };
      }

      // Fetch sales with relations (location, member, createdBy, items with product/variation, payments)
      const sales = await prisma.sale.findMany({
        where,
        include: {
          location: true,
          member: true,
          createdBy: {
            select: {
              id: true,
              username: true,
            },
          },
          payments: true,
          items: {
            include: {
              variation: {
                include: {
                  product: {
                    include: {
                      category: true,
                    },
                  },
                  attributes: {
                    include: {
                      attributeType: { select: { name: true } },
                      attributeValue: { select: { value: true } },
                    },
                  },
                },
              },
              subVariation: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (sales.length === 0) {
        return res.status(404).json({
          message: "No sales found to export",
        });
      }

      // Build payment summary string for a sale (e.g. "CASH: 1000; CARD: 500")
      const paymentSummary = (sale: (typeof sales)[0]) =>
        sale.payments
          .map((p) => `${p.method}: ${Number(p.amount)}`)
          .join("; ") || "N/A";

      // One row per line item (sale item); if sale has no items, one row with sale info and empty product columns
      type ExportRow = {
        saleCode: string;
        type: string;
        location: string;
        memberPhone: string;
        memberName: string;
        createdBy: string;
        date: string;
        notes: string;
        subtotal: number;
        discount: number;
        total: number;
        paymentSummary: string;
        productImsCode: string;
        productName: string;
        category: string;
        variation: string;
        quantity: number;
        unitPrice: number;
        totalMrp: number;
        discountPercent: number;
        discountAmount: number;
        lineTotal: number;
      };

      const buildRows = (): ExportRow[] => {
        const rows: ExportRow[] = [];
        for (const sale of sales) {
          const saleContext = {
            saleCode: sale.saleCode,
            type: sale.type,
            location: sale.location.name,
            memberPhone: sale.member?.phone ?? "Walk-in",
            memberName: sale.member?.name ?? "N/A",
            createdBy: sale.createdBy.username,
            date: new Date(sale.createdAt).toLocaleString(),
            notes: sale.notes ?? "N/A",
            subtotal: Number(sale.subtotal),
            discount: Number(sale.discount),
            total: Number(sale.total),
            paymentSummary: paymentSummary(sale),
          };
          if (sale.items.length === 0) {
            rows.push({
              ...saleContext,
              productImsCode: "",
              productName: "",
              category: "",
              variation: "",
              quantity: 0,
              unitPrice: 0,
              totalMrp: 0,
              discountPercent: 0,
              discountAmount: 0,
              lineTotal: 0,
            });
          } else {
            for (const item of sale.items) {
              const product = item.variation.product;
              const attrLabel =
                (item.variation as any).attributes
                  ?.map(
                    (a: any) =>
                      `${a.attributeType.name}: ${a.attributeValue.value}`,
                  )
                  .join(", ") || "";
              const variationDisplay = attrLabel
                ? `${item.variation.imsCode} (${attrLabel})`
                : item.variation.imsCode;
              rows.push({
                ...saleContext,
                productImsCode: item.variation.imsCode,
                productName: product.name,
                category: product.category?.name ?? "",
                variation: variationDisplay,
                quantity: item.quantity,
                unitPrice: Number(item.unitPrice),
                totalMrp: Number(item.totalMrp),
                discountPercent: Number(item.discountPercent),
                discountAmount: Number(item.discountAmount),
                lineTotal: Number(item.lineTotal),
              });
            }
          }
        }
        return rows;
      };

      const exportRows = buildRows();

      // Define columns: sale-level, then payment summary, then line-item (product) details
      const columns = [
        { header: "Sale Code", key: "saleCode", width: 20 },
        { header: "Type", key: "type", width: 12 },
        { header: "Location", key: "location", width: 25 },
        { header: "Member Phone", key: "memberPhone", width: 15 },
        { header: "Member Name", key: "memberName", width: 25 },
        { header: "Created By", key: "createdBy", width: 20 },
        { header: "Date", key: "date", width: 20 },
        { header: "Notes", key: "notes", width: 35 },
        { header: "Subtotal", key: "subtotal", width: 12 },
        { header: "Discount", key: "discount", width: 12 },
        { header: "Total", key: "total", width: 12 },
        { header: "Payment Summary", key: "paymentSummary", width: 30 },
        { header: "Product IMS Code", key: "productImsCode", width: 18 },
        { header: "Product Name", key: "productName", width: 30 },
        { header: "Category", key: "category", width: 18 },
        { header: "Attributes", key: "variation", width: 30 },
        { header: "Quantity", key: "quantity", width: 10 },
        { header: "Unit Price", key: "unitPrice", width: 12 },
        { header: "Total MRP", key: "totalMrp", width: 12 },
        { header: "Discount %", key: "discountPercent", width: 10 },
        { header: "Discount Amount", key: "discountAmount", width: 14 },
        { header: "Line Total", key: "lineTotal", width: 12 },
      ];

      // Create workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sales");
      worksheet.columns = columns;

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      // Add data rows
      exportRows.forEach((row) => {
        worksheet.addRow(row);
      });

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `sales_${timestamp}.${format === "excel" ? "xlsx" : "csv"}`;

      // Set response headers
      if (format === "excel") {
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`,
        );

        // Generate buffer and send
        const buffer = await workbook.xlsx.writeBuffer();
        res.send(buffer);
      } else {
        // CSV format
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`,
        );

        // Helper function to escape CSV values
        const escapeCsvValue = (value: any): string => {
          if (value === null || value === undefined) {
            return "";
          }
          const str = String(value);
          if (str.includes(",") || str.includes("\n") || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };

        // Build CSV rows
        const csvRows: string[] = [];
        const csvHeaders = columns.map((col) => col.header);
        csvRows.push(csvHeaders.map(escapeCsvValue).join(","));

        exportRows.forEach((row) => {
          csvRows.push(
            [
              row.saleCode,
              row.type,
              row.location,
              row.memberPhone,
              row.memberName,
              row.createdBy,
              row.date,
              row.notes,
              row.subtotal,
              row.discount,
              row.total,
              row.paymentSummary,
              row.productImsCode,
              row.productName,
              row.category,
              row.variation,
              row.quantity,
              row.unitPrice,
              row.totalMrp,
              row.discountPercent,
              row.discountAmount,
              row.lineTotal,
            ]
              .map(escapeCsvValue)
              .join(","),
          );
        });

        res.send(csvRows.join("\n"));
      }
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Download sales error");
    }
  }
}

export default new SaleController();
