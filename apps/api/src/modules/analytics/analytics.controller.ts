import { Request, Response } from "express";
import prisma from "@/config/prisma";
import {
  parseAnalyticsFilters,
  getSalesWhereForAnalytics,
} from "./analytics.filters";

class AnalyticsController {
  /** Overview analytics (admin/superAdmin) – products and users summary */
  async getOverview(req: Request, res: Response) {
    try {
      const [totalProducts, totalUsers, allUsers, recentProducts, recentUsers] =
        await Promise.all([
          prisma.product.count(),
          prisma.user.count(),
          prisma.user.findMany({ select: { role: true } }),
          prisma.product.findMany({
            take: 10,
            orderBy: { dateCreated: "desc" },
            select: {
              id: true,
              imsCode: true,
              name: true,
              mrp: true,
              dateCreated: true,
            },
          }),
          prisma.user.findMany({
            take: 10,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              username: true,
              role: true,
              createdAt: true,
            },
          }),
        ]);

      const usersByRole = [
        {
          role: "superAdmin" as const,
          count: allUsers.filter((u) => u.role === "superAdmin").length,
        },
        {
          role: "admin" as const,
          count: allUsers.filter((u) => u.role === "admin").length,
        },
        {
          role: "user" as const,
          count: allUsers.filter((u) => u.role === "user").length,
        },
      ];

      const productsWithMrp = await prisma.product.findMany({
        select: { mrp: true },
      });
      const totalValue = productsWithMrp.reduce(
        (sum, p) => sum + Number(p.mrp || 0),
        0,
      );

      res.status(200).json({
        message: "Analytics fetched successfully",
        analytics: {
          overview: {
            totalProducts,
            totalUsers,
            totalValue: totalValue.toFixed(2),
            averageProductPrice:
              totalProducts > 0
                ? (totalValue / totalProducts).toFixed(2)
                : "0.00",
          },
          usersByRole,
          recentProducts,
          recentUsers,
        },
      });
    } catch (error: unknown) {
      console.error("Get analytics error:", error);
      res.status(500).json({
        message: "Error fetching analytics",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Sales & Revenue analytics: KPIs, time series, composition, credit, user performance.
   * Uses shared filter + role so user role sees only own sales (createdById).
   */
  async getSalesRevenue(req: Request, res: Response) {
    try {
      const role = (req as any).user?.role as string | undefined;
      const currentUserId = (req as any).user?.id as string | undefined;
      const { where } = getSalesWhereForAnalytics(
        req.query,
        role,
        currentUserId,
      );

      const dateFrom =
        typeof req.query.dateFrom === "string"
          ? new Date(req.query.dateFrom)
          : undefined;
      const dateTo =
        typeof req.query.dateTo === "string" ? req.query.dateTo : undefined;
      let rangeEnd = dateTo ? new Date(dateTo) : new Date();
      rangeEnd.setHours(23, 59, 59, 999);
      let rangeStart = dateFrom || new Date(rangeEnd);
      if (!dateFrom && dateTo) rangeStart = new Date(dateTo);
      if (dateFrom) rangeStart = new Date(dateFrom);

      const creditWhere = { ...where, isCreditSale: true };

      const [
        kpisAgg,
        salesForTimeSeries,
        compositionByLocation,
        compositionByPayment,
        compositionByType,
        creditSalesForOutstanding,
        creditSalesForAging,
        paymentsBySaleId,
        paymentsForCreditByDate,
        userPerformanceRaw,
      ] = await Promise.all([
        prisma.sale.aggregate({
          where,
          _sum: { subtotal: true, total: true, discount: true },
          _count: true,
        }),
        prisma.sale.findMany({
          where,
          select: {
            subtotal: true,
            total: true,
            discount: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        }),
        prisma.sale.groupBy({
          by: ["locationId"],
          where,
          _sum: { total: true },
          _count: true,
        }),
        prisma.salePayment.groupBy({
          by: ["method"],
          where: { sale: where },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.sale.groupBy({
          by: ["type"],
          where,
          _sum: { total: true },
          _count: true,
        }),
        prisma.sale.findMany({
          where: creditWhere,
          select: { id: true, total: true },
        }),
        prisma.sale.findMany({
          where: creditWhere,
          select: { id: true, total: true, createdAt: true },
        }),
        prisma.salePayment.groupBy({
          by: ["saleId"],
          where: { sale: creditWhere },
          _sum: { amount: true },
        }),
        prisma.salePayment.findMany({
          where: { sale: creditWhere },
          select: { amount: true, createdAt: true },
        }),
        prisma.sale.groupBy({
          by: ["createdById"],
          where,
          _sum: { total: true, discount: true },
          _count: true,
        }),
      ]);

      const locationIds = [
        ...new Set(compositionByLocation.map((c) => c.locationId)),
      ];
      const locations =
        locationIds.length > 0
          ? await prisma.location.findMany({
              where: { id: { in: locationIds } },
              select: { id: true, name: true },
            })
          : [];
      const locationMap = Object.fromEntries(
        locations.map((l) => [l.id, l.name]),
      );

      const userIds = [
        ...new Set(userPerformanceRaw.map((u) => u.createdById)),
      ];
      const users =
        userIds.length > 0
          ? await prisma.user.findMany({
              where: { id: { in: userIds } },
              select: { id: true, username: true },
            })
          : [];
      const userMap = Object.fromEntries(users.map((u) => [u.id, u.username]));

      const totalRevenue = Number(kpisAgg._sum.subtotal ?? 0);
      const netRevenue = Number(kpisAgg._sum.total ?? 0);
      const totalDiscount = Number(kpisAgg._sum.discount ?? 0);
      const salesCount = kpisAgg._count;
      const avgOrderValue = salesCount > 0 ? netRevenue / salesCount : 0;

      const paymentBySaleId = Object.fromEntries(
        paymentsBySaleId.map((p) => [p.saleId, Number(p._sum.amount ?? 0)]),
      );
      let outstandingCredit = 0;
      for (const sale of creditSalesForOutstanding) {
        const paid = paymentBySaleId[sale.id] ?? 0;
        const balance = Number(sale.total) - paid;
        if (balance > 0) outstandingCredit += balance;
      }

      const dailyMap: Record<
        string,
        { date: string; gross: number; net: number; discount: number }
      > = {};
      for (const s of salesForTimeSeries) {
        const d = s.createdAt.toISOString().slice(0, 10);
        if (!dailyMap[d])
          dailyMap[d] = { date: d, gross: 0, net: 0, discount: 0 };
        dailyMap[d].gross += Number(s.subtotal);
        dailyMap[d].net += Number(s.total);
        dailyMap[d].discount += Number(s.discount);
      }
      const timeSeries = Object.values(dailyMap).sort((a, b) =>
        a.date.localeCompare(b.date),
      );

      const creditIssuedByDate: Record<string, number> = {};
      for (const s of creditSalesForAging) {
        const d = s.createdAt.toISOString().slice(0, 10);
        creditIssuedByDate[d] = (creditIssuedByDate[d] ?? 0) + Number(s.total);
      }
      const paymentSumByDate: Record<string, number> = {};
      for (const p of paymentsForCreditByDate) {
        const d = p.createdAt.toISOString().slice(0, 10);
        paymentSumByDate[d] = (paymentSumByDate[d] ?? 0) + Number(p.amount);
      }
      const allCreditDates = new Set([
        ...Object.keys(creditIssuedByDate),
        ...Object.keys(paymentSumByDate),
      ]);
      const creditTimeSeries = [...allCreditDates].sort().map((date) => ({
        date,
        issued: creditIssuedByDate[date] ?? 0,
        paid: paymentSumByDate[date] ?? 0,
      }));

      const now = new Date();
      let aging0_7 = 0,
        aging8_30 = 0,
        aging30Plus = 0;
      for (const sale of creditSalesForAging) {
        const paid = paymentBySaleId[sale.id] ?? 0;
        if (Number(sale.total) <= paid) continue;
        const days = Math.floor(
          (now.getTime() - sale.createdAt.getTime()) / (24 * 60 * 60 * 1000),
        );
        const balance = Number(sale.total) - paid;
        if (days <= 7) aging0_7 += balance;
        else if (days <= 30) aging8_30 += balance;
        else aging30Plus += balance;
      }

      const compositionLocation = compositionByLocation.map((c) => ({
        locationId: c.locationId,
        locationName: locationMap[c.locationId] ?? c.locationId,
        revenue: Number(c._sum.total ?? 0),
        count: c._count,
      }));
      const compositionPayment = compositionByPayment.map((c) => ({
        method: c.method,
        revenue: Number(c._sum.amount ?? 0),
        count: c._count,
      }));
      const compositionType = compositionByType.map((c) => ({
        type: c.type,
        revenue: Number(c._sum.total ?? 0),
        count: c._count,
      }));

      const userPerformance = userPerformanceRaw.map((u) => ({
        userId: u.createdById,
        username: userMap[u.createdById] ?? u.createdById,
        revenue: Number(u._sum.total ?? 0),
        salesCount: u._count,
        avgDiscount: u._count > 0 ? Number(u._sum.discount ?? 0) / u._count : 0,
      }));

      res.status(200).json({
        message: "Sales revenue analytics fetched",
        data: {
          kpis: {
            totalRevenue,
            netRevenue,
            salesCount,
            avgOrderValue,
            totalDiscount,
            outstandingCredit,
          },
          timeSeries,
          composition: {
            byLocation: compositionLocation,
            byPaymentMethod: compositionPayment,
            bySaleType: compositionType,
          },
          credit: {
            timeSeries: creditTimeSeries,
            aging: { "0-7": aging0_7, "8-30": aging8_30, "30+": aging30Plus },
          },
          userPerformance,
        },
      });
    } catch (error: unknown) {
      console.error("Get sales revenue analytics error:", error);
      res.status(500).json({
        message: "Error fetching sales revenue analytics",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Inventory & Operations analytics: KPIs, health quadrant, heatmap, aging, transfer funnel.
   * Filter by date range, locationIds, categoryId, vendorId (no role scoping; inventory is workspace-level).
   */
  async getInventoryOps(req: Request, res: Response) {
    try {
      const filters = parseAnalyticsFilters(
        req.query as Record<string, unknown>,
      );

      const invWhere: Record<string, unknown> = {};
      if (filters.locationIds?.length) {
        invWhere.locationId = { in: filters.locationIds };
      }
      if (filters.categoryId || filters.vendorId) {
        invWhere.variation = {
          product: {
            ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
            ...(filters.vendorId ? { vendorId: filters.vendorId } : {}),
          },
        };
      }

      const [inventoryItems, transferCounts, completedTransfers] =
        await Promise.all([
          prisma.locationInventory.findMany({
            where: invWhere,
            include: {
              variation: {
                include: {
                  product: {
                    select: {
                      id: true,
                      costPrice: true,
                      mrp: true,
                      categoryId: true,
                      category: { select: { id: true, name: true } },
                    },
                  },
                },
              },
              location: { select: { id: true, name: true } },
            },
          }),
          prisma.transfer.groupBy({
            by: ["status"],
            _count: true,
          }),
          prisma.transfer.findMany({
            where: { status: "COMPLETED", completedAt: { not: null } },
            select: {
              createdAt: true,
              completedAt: true,
            },
          }),
        ]);

      let totalStockValueCost = 0;
      let totalStockValueMrp = 0;
      let lowStockCount = 0;
      let outOfStockCount = 0;
      const categoryLocationValue: Record<string, Record<string, number>> = {};
      const productQuantity: Record<string, number> = {};
      const aging0_30: number[] = [];
      const aging31_60: number[] = [];
      const aging61_90: number[] = [];
      const aging90Plus: number[] = [];
      const now = new Date();

      for (const inv of inventoryItems) {
        const qty = inv.quantity;
        const cost = Number(inv.variation.product.costPrice ?? 0);
        const mrp = Number(inv.variation.product.mrp ?? 0);
        totalStockValueCost += qty * cost;
        totalStockValueMrp += qty * mrp;
        if (qty === 0) outOfStockCount += 1;
        else if (qty <= 5) lowStockCount += 1;

        const catName = inv.variation.product.category?.name ?? "Other";
        if (!categoryLocationValue[catName]) {
          categoryLocationValue[catName] = {};
        }
        categoryLocationValue[catName][inv.location.name] =
          (categoryLocationValue[catName][inv.location.name] ?? 0) + qty * mrp;

        const productId = inv.variation.product.id;
        productQuantity[productId] = (productQuantity[productId] ?? 0) + qty;

        const value = qty * mrp;
        const created = inv.createdAt.getTime();
        const days = (now.getTime() - created) / (24 * 60 * 60 * 1000);
        if (days <= 30) aging0_30.push(value);
        else if (days <= 60) aging31_60.push(value);
        else if (days <= 90) aging61_90.push(value);
        else aging90Plus.push(value);
      }

      const velocityQuantity = Object.entries(productQuantity).map(
        ([productId, quantity]) => ({
          velocity: 0,
          quantity,
          name: productId,
        }),
      );

      const heatmapRows = Object.entries(categoryLocationValue).map(
        ([category, locs]) => ({
          category,
          ...locs,
          total: Object.values(locs).reduce((a, b) => a + b, 0),
        }),
      );

      const funnel = {
        PENDING:
          transferCounts.find((t) => t.status === "PENDING")?._count ?? 0,
        APPROVED:
          transferCounts.find((t) => t.status === "APPROVED")?._count ?? 0,
        IN_TRANSIT:
          transferCounts.find((t) => t.status === "IN_TRANSIT")?._count ?? 0,
        COMPLETED:
          transferCounts.find((t) => t.status === "COMPLETED")?._count ?? 0,
      };

      let avgCompletionMs = 0;
      if (completedTransfers.length > 0) {
        const totalMs = completedTransfers.reduce(
          (sum, t) => sum + (t.completedAt!.getTime() - t.createdAt.getTime()),
          0,
        );
        avgCompletionMs = totalMs / completedTransfers.length;
      }

      const agingBuckets = {
        "0-30": aging0_30.reduce((a, b) => a + b, 0),
        "31-60": aging31_60.reduce((a, b) => a + b, 0),
        "61-90": aging61_90.reduce((a, b) => a + b, 0),
        "90+": aging90Plus.reduce((a, b) => a + b, 0),
      };

      res.status(200).json({
        message: "Inventory ops analytics fetched",
        data: {
          kpis: {
            totalStockValueCost,
            totalStockValueMrp,
            lowStockCount,
            outOfStockCount,
            deadStockValue: 0,
          },
          healthQuadrant: velocityQuantity.slice(0, 100),
          heatmap: heatmapRows,
          aging: agingBuckets,
          transferFunnel: funnel,
          avgTransferCompletionDays: avgCompletionMs / (24 * 60 * 60 * 1000),
        },
      });
    } catch (error: unknown) {
      console.error("Get inventory ops error:", error);
      res.status(500).json({
        message: "Error fetching inventory ops analytics",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Customers, Products & Promotions analytics: member KPIs, cohort, product performance, promo effectiveness.
   * Filter by date range, locationIds, categoryId, vendorId.
   */
  async getCustomersPromos(req: Request, res: Response) {
    try {
      const filters = parseAnalyticsFilters(
        req.query as Record<string, unknown>,
      );
      const role = (req as any).user?.role as string | undefined;
      const currentUserId = (req as any).user?.id as string | undefined;
      const { where: salesWhere } = getSalesWhereForAnalytics(
        req.query as Record<string, unknown>,
        role,
        currentUserId,
      );

      const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
      const dateTo = filters.dateTo
        ? (() => {
            const d = new Date(filters.dateTo);
            d.setHours(23, 59, 59, 999);
            return d;
          })()
        : null;

      const [
        memberCount,
        newMembersInPeriod,
        membersWithSales,
        productPerformanceRaw,
        promoCodes,
      ] = await Promise.all([
        prisma.member.count(),
        dateFrom && dateTo
          ? prisma.member.count({
              where: {
                OR: [
                  { memberSince: { gte: dateFrom, lte: dateTo } },
                  { createdAt: { gte: dateFrom, lte: dateTo } },
                ],
              },
            })
          : Promise.resolve(0),
        prisma.sale.groupBy({
          by: ["memberId"],
          where: { ...salesWhere, memberId: { not: null } },
          _count: true,
        }),
        prisma.saleItem.groupBy({
          by: ["variationId"],
          where: { sale: salesWhere },
          _sum: { lineTotal: true, quantity: true },
          _count: true,
        }),
        prisma.promoCode.findMany({
          where: { isActive: true },
          select: {
            id: true,
            code: true,
            usageCount: true,
            value: true,
          },
        }),
      ]);

      const memberIdsWithSales = new Set(
        membersWithSales.map((m) => m.memberId).filter(Boolean) as string[],
      );
      const repeatCount = membersWithSales.filter((m) => m._count > 1).length;
      const repeatPercent =
        memberIdsWithSales.size > 0
          ? (repeatCount / memberIdsWithSales.size) * 100
          : 0;

      const variationIds = [
        ...new Set(productPerformanceRaw.map((p) => p.variationId)),
      ];
      const variations =
        variationIds.length > 0
          ? await prisma.productVariation.findMany({
              where: { id: { in: variationIds } },
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    costPrice: true,
                    mrp: true,
                  },
                },
              },
            })
          : [];

      const productPerf = productPerformanceRaw.map((p) => {
        const v = variations.find((x) => x.id === p.variationId);
        const cost = v ? Number(v.product.costPrice ?? 0) : 0;
        const revenue = Number(p._sum.lineTotal ?? 0);
        const qty = Number(p._sum.quantity ?? 0) || p._count;
        const margin = revenue - qty * cost;
        return {
          productId: v?.product.id ?? p.variationId,
          productName: v?.product.name ?? p.variationId,
          revenue,
          quantity: qty,
          margin,
        };
      });

      res.status(200).json({
        message: "Customers promos analytics fetched",
        data: {
          memberKpis: {
            totalMembers: memberCount,
            newInPeriod: newMembersInPeriod,
            repeatPercent,
          },
          cohort: [],
          productPerformance: productPerf,
          promoEffectiveness: {
            promos: promoCodes.map((c) => ({
              code: c.code,
              usageCount: c.usageCount,
              value: Number(c.value),
            })),
            totalUsageCount: promoCodes.reduce((s, c) => s + c.usageCount, 0),
          },
        },
      });
    } catch (error: unknown) {
      console.error("Get customers promos error:", error);
      res.status(500).json({
        message: "Error fetching customers promos analytics",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export default new AnalyticsController();
