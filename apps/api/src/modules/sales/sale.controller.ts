import { Request, Response } from "express";
import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { z } from "zod";
import csvParser from "csv-parser";
import {
  excelSaleRowSchema,
  type ExcelSaleRow,
  type ValidationError,
} from "./bulkUpload.validation";

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
        items,
        notes,
        payments,
      }: {
        locationId: string;
        memberPhone?: string;
        memberName?: string;
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
          // Auto-create member with phone and optional name
          member = await prisma.member.create({
            data: {
              phone: normalizedPhone,
              name: memberName?.trim() || null,
            },
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
                typeName.includes("member") || typeName.includes("non-member")
              );
            }
            // Non-member sale
            return (
              typeName.includes("non-member") || typeName.includes("wholesale")
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

      const total = Math.round((subtotal - totalDiscount) * 100) / 100;

      // Optional: validate payment breakdown matches total
      if (payments && payments.length > 0) {
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

  /**
   * Preview sale total (same discount + promo logic as createSale, no DB writes).
   * Use so frontend can show exact total and validate payment.
   */
  async previewSale(req: Request, res: Response) {
    try {
      const {
        locationId,
        memberPhone,
        memberName,
        items,
      }: {
        locationId: string;
        memberPhone?: string;
        memberName?: string;
        items: Array<{
          variationId: string;
          quantity: number;
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

      let member: { id: string; isActive: boolean } | null = null;
      let saleType: "GENERAL" | "MEMBER" = "GENERAL";
      if (memberPhone) {
        const normalizedPhone = String(memberPhone)
          .replace(/[\s-]/g, "")
          .trim();
        member = await prisma.member.findUnique({
          where: { phone: normalizedPhone },
          select: { id: true, isActive: true },
        });
        if (member?.isActive) saleType = "MEMBER";
      }

      let subtotal = 0;
      let totalDiscount = 0;

      for (const item of items) {
        if (!item.variationId || !item.quantity || item.quantity <= 0) {
          return res.status(400).json({
            message: "Each item must have variationId and positive quantity",
          });
        }

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
                  include: { discountType: true },
                },
              },
            },
          },
        });

        if (!variation) {
          return res.status(404).json({
            message: `Variation ${item.variationId} not found`,
          });
        }

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

        const unitPrice = Number(variation.product.mrp);
        const itemSubtotal = unitPrice * item.quantity;
        let discountPercent = 0;
        let discountAmount = 0;

        const activeDiscounts = variation.product.discounts as Array<
          (typeof variation.product.discounts)[number] & {
            discountType: { name: string };
          }
        >;
        let baseDiscount: (typeof activeDiscounts)[number] | null = null;

        if (activeDiscounts?.length > 0) {
          const eligible = activeDiscounts.filter((d) => {
            const typeName = d.discountType.name.toLowerCase();
            if (saleType === "MEMBER") {
              return (
                typeName.includes("member") || typeName.includes("non-member")
              );
            }
            return (
              typeName.includes("non-member") || typeName.includes("wholesale")
            );
          });

          if (eligible.length > 0) {
            eligible.sort((a, b) => {
              const aIsSpecial =
                a.discountType.name.toLowerCase() === "special" ? 1 : 0;
              const bIsSpecial =
                b.discountType.name.toLowerCase() === "special" ? 1 : 0;
              if (aIsSpecial !== bIsSpecial) return bIsSpecial - aIsSpecial;
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

        if (item.promoCode) {
          const promo = await prisma.promoCode.findUnique({
            where: { code: item.promoCode },
            include: {
              products: { include: { product: true } },
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
                (pp: { productId: string }) =>
                  pp.productId === variation.productId,
              );
              let isCustomerEligible = false;
              if (promo.eligibility === "ALL") isCustomerEligible = true;
              else if (promo.eligibility === "MEMBER")
                isCustomerEligible = saleType === "MEMBER";
              else if (promo.eligibility === "NON_MEMBER")
                isCustomerEligible = saleType === "GENERAL";

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
                  discountAmount = promoDiscountAmount;
                  discountPercent = 0;
                } else if (promo.allowStacking) {
                  discountAmount += promoDiscountAmount;
                } else {
                  const baseTotalDiscount =
                    discountAmount + itemSubtotal * (discountPercent / 100);
                  if (promoDiscountAmount > baseTotalDiscount) {
                    discountAmount = promoDiscountAmount;
                    discountPercent = 0;
                  }
                }
                // Preview: do not increment promo usageCount
              }
            }
          }
        }

        const effectiveDiscount =
          Math.min(
            itemSubtotal,
            discountAmount + itemSubtotal * (discountPercent / 100),
          ) || 0;
        subtotal += itemSubtotal;
        totalDiscount += effectiveDiscount;
      }

      const total = Math.round((subtotal - totalDiscount) * 100) / 100;

      res.json({
        subtotal: Math.round(subtotal * 100) / 100,
        discount: Math.round(totalDiscount * 100) / 100,
        total,
      });
    } catch (error: unknown) {
      console.error("Preview sale error:", error);
      res.status(500).json({
        message: "Error computing preview",
        error: error instanceof Error ? error.message : String(error),
      });
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

  // Bulk upload sales from Excel or CSV file
  async bulkUploadSales(req: Request, res: Response) {
    const errors: ValidationError[] = [];
    const createdSales: {
      id: string;
      saleCode: string;
      itemsCount: number;
    }[] = [];
    const skippedSales: {
      saleId: string | null;
      reason: string;
    }[] = [];

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

      const filePath = req.file.path;
      const fileExt = path.extname(req.file.originalname).toLowerCase();
      const isCSV = fileExt === ".csv";

      const normalizeHeader = (header: string): string => {
        return header
          .toString()
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]/g, "")
          .replace(/\s+/g, "");
      };

      const headerMappings: Record<string, string[]> = {
        sn: ["sn", "sno", "serial", "serialnumber"],
        saleId: ["saleid", "sale_id", "id"],
        dateOfSale: [
          "dateofsale",
          "date_of_sale",
          "date",
          "saledate",
          "sale_date",
        ],
        showroom: ["showroom", "location", "store"],
        phone: [
          "phonenumber",
          "phone_number",
          "phone",
          "customerphone",
          "customer_phone",
          "mobile",
          "contact",
        ],
        soldBy: ["soldby", "sold_by", "seller", "createdby", "created_by"],
        productImsCode: [
          "productimscode",
          "product_ims_code",
          "imscode",
          "ims_code",
          "ims",
        ],
        productName: [
          "productname",
          "product_name",
          "name",
          "product",
          "productnamr",
        ],
        variation: ["variation", "color", "design", "variations"],
        quantity: ["quantity", "qty", "qty"],
        mrp: ["mrp", "price", "unitprice", "unit_price"],
        discount: ["discount", "discountpercent", "discount_percent"],
        finalAmount: [
          "finalamount",
          "final_amount",
          "line_total",
          "linetotal",
          "amount",
        ],
        paymentMethod: ["paymentmethod", "payment_method", "method", "payment"],
      };

      const requiredColumns = [
        "showroom",
        "soldBy",
        "productImsCode",
        "productName",
        "variation",
        "quantity",
        "mrp",
        "finalAmount",
      ];
      let rows: ExcelSaleRow[] = [];

      if (isCSV) {
        const csvRows: Record<string, any>[] = [];
        const csvColumnMap: Record<string, string> = {};

        await new Promise<void>((resolve, reject) => {
          fs.createReadStream(filePath)
            .pipe(csvParser())
            .on("data", (row: Record<string, any>) => csvRows.push(row))
            .on("end", () => resolve())
            .on("error", reject);
        });

        if (csvRows.length === 0) {
          fs.unlinkSync(filePath);
          return res.status(400).json({
            message: "CSV file is empty or invalid",
            summary: { total: 0, created: 0, skipped: 0, errors: 0 },
            created: [],
            skipped: [],
            errors: [],
          });
        }

        const csvHeaders = Object.keys(csvRows[0] || {});
        for (const csvHeader of csvHeaders) {
          const normalized = normalizeHeader(csvHeader);
          let bestMatch: { fieldName: string; priority: number } | null = null;
          for (const [fieldName, variations] of Object.entries(
            headerMappings,
          )) {
            if (csvColumnMap[fieldName]) continue;
            if (variations.some((v) => normalized === v)) {
              bestMatch = { fieldName, priority: 2 };
              break;
            }
            if (
              !bestMatch &&
              variations.some(
                (v) => normalized.includes(v) || v.includes(normalized),
              )
            ) {
              bestMatch = { fieldName, priority: 1 };
            }
          }
          if (bestMatch) csvColumnMap[bestMatch.fieldName] = csvHeader;
        }

        const missingColumns = requiredColumns.filter(
          (col) => !csvColumnMap[col],
        );
        if (missingColumns.length > 0) {
          fs.unlinkSync(filePath);
          return res.status(400).json({
            message: "Missing required columns in CSV file",
            missingColumns,
            foundColumns: Object.keys(csvColumnMap),
            hint: "Required: Showroom, Sold by, Product IMS code, Product Name, Variation, Quantity, MRP, Final amount. Optional: SN, sale_id, Date of sale, Phone number, Discount, Payment method (CASH, CARD, CHEQUE, FONEPAY, QR).",
            summary: { total: 0, created: 0, skipped: 0, errors: 0 },
            created: [],
            skipped: [],
            errors: [],
          });
        }

        csvRows.forEach((csvRow, rowIndex) => {
          const getCellValue = (fieldName: string) => {
            const col = csvColumnMap[fieldName];
            if (!col) return undefined;
            const value = csvRow[col];
            return value === "" || value === null ? undefined : value;
          };
          const rowData = {
            sn: getCellValue("sn"),
            saleId: getCellValue("saleId"),
            dateOfSale: getCellValue("dateOfSale"),
            showroom: getCellValue("showroom"),
            phone: getCellValue("phone"),
            soldBy: getCellValue("soldBy"),
            productImsCode: getCellValue("productImsCode"),
            productName: getCellValue("productName"),
            variation: getCellValue("variation"),
            quantity: getCellValue("quantity"),
            mrp: getCellValue("mrp"),
            discount: getCellValue("discount"),
            finalAmount: getCellValue("finalAmount"),
            paymentMethod: getCellValue("paymentMethod"),
          };
          const hasData = Object.values(rowData).some(
            (v) =>
              v !== null &&
              v !== undefined &&
              String(v).trim() !== "" &&
              String(v) !== "-",
          );
          if (!hasData) return;
          try {
            rows.push(excelSaleRowSchema.parse(rowData));
          } catch (error: any) {
            if (error instanceof z.ZodError) {
              error.errors.forEach((err: any) => {
                const fieldValue = err.path.reduce(
                  (obj: any, key: string) => obj?.[key],
                  rowData,
                );
                errors.push({
                  row: rowIndex + 2,
                  field: err.path.join("."),
                  message: err.message,
                  value: fieldValue,
                });
              });
            } else {
              errors.push({
                row: rowIndex + 2,
                message: error.message || "Invalid row data",
              });
            }
          }
        });
      } else {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);

        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          fs.unlinkSync(filePath);
          return res.status(400).json({
            message: "Excel file must contain at least one worksheet",
            summary: { total: 0, created: 0, skipped: 0, errors: 0 },
            created: [],
            skipped: [],
            errors: [],
          });
        }

        const columnMap: Record<string, number> = {};
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell, colNumber) => {
          if (cell.value) {
            const headerValue = String(cell.value).trim();
            const normalized = normalizeHeader(headerValue);
            let bestMatch: { fieldName: string; priority: number } | null =
              null;
            for (const [fieldName, variations] of Object.entries(
              headerMappings,
            )) {
              if (columnMap[fieldName]) continue;
              if (variations.some((v) => normalized === v)) {
                bestMatch = { fieldName, priority: 2 };
                break;
              }
              if (
                !bestMatch &&
                variations.some(
                  (v) => normalized.includes(v) || v.includes(normalized),
                )
              ) {
                bestMatch = { fieldName, priority: 1 };
              }
            }
            if (bestMatch) columnMap[bestMatch.fieldName] = colNumber;
          }
        });

        const missingColumns = requiredColumns.filter((col) => !columnMap[col]);
        if (missingColumns.length > 0) {
          fs.unlinkSync(filePath);
          return res.status(400).json({
            message: "Missing required columns in Excel file",
            missingColumns,
            foundColumns: Object.keys(columnMap),
            hint: "Required: Showroom, Sold by, Product IMS code, Product Name, Variation, Quantity, MRP, Final amount. Optional: SN, sale_id, Date of sale, Phone number, Discount, Payment method (CASH, CARD, CHEQUE, FONEPAY, QR).",
            summary: { total: 0, created: 0, skipped: 0, errors: 0 },
            created: [],
            skipped: [],
            errors: [],
          });
        }

        worksheet.eachRow((row, rowIndex) => {
          if (rowIndex === 1) return;
          const getCellValue = (fieldName: string) => {
            const colNumber = columnMap[fieldName];
            return colNumber ? row.getCell(colNumber).value : undefined;
          };
          const rowData = {
            sn: getCellValue("sn"),
            saleId: getCellValue("saleId"),
            dateOfSale: getCellValue("dateOfSale"),
            showroom: getCellValue("showroom"),
            phone: getCellValue("phone"),
            soldBy: getCellValue("soldBy"),
            productImsCode: getCellValue("productImsCode"),
            productName: getCellValue("productName"),
            variation: getCellValue("variation"),
            quantity: getCellValue("quantity"),
            mrp: getCellValue("mrp"),
            discount: getCellValue("discount"),
            finalAmount: getCellValue("finalAmount"),
            paymentMethod: getCellValue("paymentMethod"),
          };
          const hasData = Object.values(rowData).some(
            (v) =>
              v !== null &&
              v !== undefined &&
              String(v).trim() !== "" &&
              String(v) !== "-",
          );
          if (!hasData) return;
          try {
            rows.push(excelSaleRowSchema.parse(rowData));
          } catch (error: any) {
            if (error instanceof z.ZodError) {
              error.errors.forEach((err: any) => {
                const fieldValue = err.path.reduce(
                  (obj: any, key: string) => obj?.[key],
                  rowData,
                );
                errors.push({
                  row: rowIndex,
                  field: err.path.join("."),
                  message: err.message,
                  value: fieldValue,
                });
              });
            } else {
              errors.push({
                row: rowIndex,
                message: error.message || "Invalid row data",
              });
            }
          }
        });
      }

      // Group rows by sale_id (or by date + showroom + soldBy if no sale_id)
      // Rows with the same sale_id should be grouped together
      const saleGroups = new Map<
        string,
        {
          saleId: string | null;
          dateOfSale: Date | null;
          showroom: string;
          soldBy: string;
          rows: ExcelSaleRow[];
        }
      >();

      rows.forEach((row) => {
        let groupKey: string;
        if (row.saleId) {
          // Group by sale_id
          groupKey = `id:${row.saleId}`;
        } else {
          // Group by date + showroom + soldBy (same sale if all match)
          const dateStr = row.dateOfSale
            ? row.dateOfSale.toISOString().split("T")[0]
            : "no-date";
          groupKey = `group:${dateStr}-${row.showroom.toLowerCase()}-${row.soldBy.toLowerCase()}`;
        }

        if (!saleGroups.has(groupKey)) {
          saleGroups.set(groupKey, {
            saleId: row.saleId,
            dateOfSale: row.dateOfSale,
            showroom: row.showroom,
            soldBy: row.soldBy,
            rows: [],
          });
        }
        saleGroups.get(groupKey)!.rows.push(row);
      });

      // Pre-fetch all locations, users, products, and variations for efficiency
      const allLocations = await prisma.location.findMany({
        where: { type: "SHOWROOM", isActive: true },
        select: { id: true, name: true },
      });
      const locationMap = new Map(
        allLocations.map((loc) => [loc.name.toLowerCase(), loc.id]),
      );

      const allUsers = await prisma.user.findMany({
        select: { id: true, username: true },
      });
      const userMap = new Map(
        allUsers.map((u) => [u.username.toLowerCase(), u.id]),
      );

      const allProducts = await prisma.product.findMany({
        select: { id: true, imsCode: true, name: true },
      });
      const productMapByIms = new Map(
        allProducts.map((p) => [p.imsCode.toLowerCase(), p]),
      );
      const productMapByName = new Map(
        allProducts.map((p) => [p.name.toLowerCase(), p]),
      );

      // Process each sale group
      for (const [groupKey, group] of saleGroups.entries()) {
        try {
          if (group.rows.length === 0) continue;

          const firstRow = group.rows[0];

          // Check if sale_id already exists
          if (group.saleId) {
            const existingSale = await prisma.sale.findUnique({
              where: { id: group.saleId },
            });
            if (existingSale) {
              skippedSales.push({
                saleId: group.saleId,
                reason: `Sale with ID "${group.saleId}" already exists`,
              });
              continue;
            }
          }

          // Find location by showroom name
          const showroomNameLower = firstRow.showroom.toLowerCase();
          let locationId = locationMap.get(showroomNameLower);

          if (!locationId) {
            const location = allLocations.find(
              (l) => l.name.toLowerCase() === showroomNameLower,
            );
            if (location) {
              locationId = location.id;
              locationMap.set(showroomNameLower, locationId);
            } else {
              errors.push({
                row: rows.indexOf(firstRow) + 2,
                field: "showroom",
                message: `Showroom "${firstRow.showroom}" not found or is not active`,
                value: firstRow.showroom,
              });
              skippedSales.push({
                saleId: group.saleId,
                reason: `Showroom "${firstRow.showroom}" not found`,
              });
              continue;
            }
          }

          // Find user by username (sold by)
          const soldByLower = firstRow.soldBy.toLowerCase();
          let userId = userMap.get(soldByLower);

          if (!userId) {
            const user = allUsers.find(
              (u) => u.username.toLowerCase() === soldByLower,
            );
            if (user) {
              userId = user.id;
              userMap.set(soldByLower, userId);
            } else {
              errors.push({
                row: rows.indexOf(firstRow) + 2,
                field: "soldBy",
                message: `User "${firstRow.soldBy}" not found`,
                value: firstRow.soldBy,
              });
              skippedSales.push({
                saleId: group.saleId,
                reason: `User "${firstRow.soldBy}" not found`,
              });
              continue;
            }
          }

          // Phone number → member sale: find or create member, set type MEMBER
          let memberId: string | null = null;
          let saleType: "GENERAL" | "MEMBER" = "GENERAL";

          const phoneVal = firstRow.phone;
          if (phoneVal && phoneVal.length > 0) {
            let member = await prisma.member.findUnique({
              where: { phone: phoneVal },
            });
            if (!member) {
              member = await prisma.member.create({
                data: { phone: phoneVal },
              });
            }
            memberId = member.id;
            saleType = "MEMBER";
          }

          // Process items and find variations
          const saleItems: Array<{
            variationId: string;
            quantity: number;
            unitPrice: number;
            discountPercent: number;
            discountAmount: number;
            lineTotal: number;
          }> = [];

          let subtotal = 0;
          let totalDiscount = 0;

          for (const itemRow of group.rows) {
            // Find product by IMS code or name
            const imsCodeLower = itemRow.productImsCode.toLowerCase();
            const nameLower = itemRow.productName.toLowerCase();

            let product =
              productMapByIms.get(imsCodeLower) ||
              productMapByName.get(nameLower);

            if (!product) {
              errors.push({
                row: rows.indexOf(itemRow) + 2,
                field: "productImsCode",
                message: `Product with IMS code "${itemRow.productImsCode}" or name "${itemRow.productName}" not found`,
                value: itemRow.productImsCode,
              });
              continue;
            }

            // Find variation by productId and color
            const variation = await prisma.productVariation.findFirst({
              where: {
                productId: product.id,
                color: {
                  equals: itemRow.variation,
                  mode: "insensitive",
                },
              },
            });

            if (!variation) {
              errors.push({
                row: rows.indexOf(itemRow) + 2,
                field: "variation",
                message: `Variation "${itemRow.variation}" not found for product "${itemRow.productName}"`,
                value: itemRow.variation,
              });
              continue;
            }

            // Calculate values from Excel
            const unitPrice = itemRow.mrp;
            const quantity = itemRow.quantity;
            const totalMrp = unitPrice * quantity; // Total MRP before discount
            const discountPercent = itemRow.discount || 0;
            const discountAmount = (totalMrp * discountPercent) / 100;
            const lineTotal = itemRow.finalAmount; // Final amount after discount

            subtotal += totalMrp;
            totalDiscount += discountAmount;

            saleItems.push({
              variationId: variation.id,
              quantity,
              unitPrice,
              discountPercent,
              discountAmount,
              lineTotal,
            });
          }

          if (saleItems.length === 0) {
            skippedSales.push({
              saleId: group.saleId,
              reason: "No valid items found for this sale",
            });
            continue;
          }

          const total = subtotal - totalDiscount;

          // Determine payment method (use first row's payment method, or default to CASH)
          const paymentMethods = group.rows
            .map((r) => r.paymentMethod)
            .filter(
              (method): method is string =>
                method !== null && method !== undefined,
            );
          const paymentMethod =
            paymentMethods.length > 0
              ? (paymentMethods[0] as
                  | "CASH"
                  | "CARD"
                  | "CHEQUE"
                  | "FONEPAY"
                  | "QR")
              : "CASH";

          // Create sale
          const sale = await prisma.sale.create({
            data: {
              ...(group.saleId && { id: group.saleId }),
              saleCode: generateSaleCode(),
              type: saleType,
              locationId,
              ...(memberId && { memberId }),
              createdById: userId,
              subtotal,
              discount: totalDiscount,
              total,
              createdAt: group.dateOfSale || new Date(),
              items: {
                create: saleItems.map((item) => ({
                  variationId: item.variationId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  totalMrp: item.unitPrice * item.quantity,
                  discountPercent: item.discountPercent,
                  discountAmount: item.discountAmount,
                  lineTotal: item.lineTotal,
                })),
              },
              payments: {
                create: [
                  {
                    method: paymentMethod,
                    amount: total,
                  },
                ],
              },
            },
            include: {
              items: true,
            },
          });

          createdSales.push({
            id: sale.id,
            saleCode: sale.saleCode,
            itemsCount: sale.items.length,
          });
        } catch (error: any) {
          errors.push({
            row: rows.indexOf(group.rows[0]) + 2,
            message: error.message || "Error creating sale",
          });
          skippedSales.push({
            saleId: group.saleId,
            reason: error.message || "Error creating sale",
          });
        }
      }

      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error("Error cleaning up file:", e);
      }

      res.status(200).json({
        message: "Bulk upload completed",
        summary: {
          total: saleGroups.size,
          created: createdSales.length,
          skipped: skippedSales.length,
          errors: errors.length,
        },
        created: createdSales,
        skipped: skippedSales,
        errors,
      });
    } catch (error: any) {
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.error("Error cleaning up file:", e);
        }
      }
      console.error("Bulk upload sales error:", error);
      res.status(500).json({
        message: "Error processing bulk upload",
        error: error.message,
        summary: {
          total: 0,
          created: createdSales.length,
          skipped: skippedSales.length,
          errors: errors.length,
        },
        created: createdSales,
        skipped: skippedSales,
        errors,
      });
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

      // Fetch sales with relations
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
          items: {
            include: {
              variation: {
                include: {
                  product: {
                    include: {
                      category: true,
                    },
                  },
                },
              },
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

      // Create workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sales");

      // Define columns
      const columns = [
        { header: "Sale Code", key: "saleCode", width: 20 },
        { header: "Type", key: "type", width: 12 },
        { header: "Location", key: "location", width: 25 },
        { header: "Member Phone", key: "memberPhone", width: 15 },
        { header: "Member Name", key: "memberName", width: 25 },
        { header: "Subtotal", key: "subtotal", width: 15 },
        { header: "Discount", key: "discount", width: 15 },
        { header: "Total", key: "total", width: 15 },
        { header: "Items Count", key: "itemsCount", width: 12 },
        { header: "Created By", key: "createdBy", width: 20 },
        { header: "Date", key: "date", width: 20 },
        { header: "Notes", key: "notes", width: 40 },
      ];

      worksheet.columns = columns;

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      // Add data rows
      sales.forEach((sale) => {
        worksheet.addRow({
          saleCode: sale.saleCode,
          type: sale.type,
          location: sale.location.name,
          memberPhone: sale.member?.phone || "Walk-in",
          memberName: sale.member?.name || "N/A",
          subtotal: sale.subtotal,
          discount: sale.discount,
          total: sale.total,
          itemsCount: sale.items?.length || 0,
          createdBy: sale.createdBy.username,
          date: new Date(sale.createdAt).toLocaleString(),
          notes: sale.notes || "N/A",
        });
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

        // Header row
        csvRows.push(
          columns.map((col) => escapeCsvValue(col.header)).join(","),
        );

        // Data rows
        sales.forEach((sale) => {
          csvRows.push(
            [
              sale.saleCode,
              sale.type,
              sale.location.name,
              sale.member?.phone || "Walk-in",
              sale.member?.name || "N/A",
              sale.subtotal,
              sale.discount,
              sale.total,
              sale.items?.length || 0,
              sale.createdBy.username,
              new Date(sale.createdAt).toLocaleString(),
              sale.notes || "N/A",
            ]
              .map(escapeCsvValue)
              .join(","),
          );
        });

        res.send(csvRows.join("\n"));
      }
    } catch (error: any) {
      console.error("Download sales error:", error);
      res
        .status(500)
        .json({ message: "Error downloading sales", error: error.message });
    }
  }
}

export default new SaleController();
