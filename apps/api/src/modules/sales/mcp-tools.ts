/**
 * MCP Analytics Tools for Sales Module
 *
 * Five analytics tools for sales data analysis with automatic tenant scoping.
 * Do not edit mcp.server.ts — just call registerSalesAnalyticsTools(server, authCtx)
 * from there.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import prisma from "@/config/prisma";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import { createSale } from "@/modules/sales/sale.service";
import {
  getDailyBreakdown,
  getComparePeriodData,
  getProductBreakdown,
  getVelocityMetrics,
  getLastSoldDates,
} from "@/modules/sales/sales.analytics";

export function registerSalesAnalyticsTools(
  server: McpServer,
  authCtx: McpAuthContext,
) {
  // Bypass TS2589 deep-inference via loose signature alias (see mcp.server.ts lines 34-42)
  const registerTool = server.registerTool.bind(server) as (
    name: string,
    config: {
      title?: string;
      description?: string;
      inputSchema?: Record<string, z.ZodTypeAny>;
    },
    handler: (args: any) => Promise<unknown> | unknown,
  ) => unknown;

  // ──────────────────────────────────────────────────────────────────────────
  // 1. sales_daily_breakdown
  // ──────────────────────────────────────────────────────────────────────────

  registerTool(
    "sales_daily_breakdown",
    {
      title: "Sales daily breakdown",
      description:
        "Revenue, units, and transaction count aggregated by calendar day within a date range. Includes zero-days (days with no sales) in the output.",
      inputSchema: {
        from: z.string().describe("ISO date (inclusive)"),
        to: z.string().describe("ISO date (exclusive)"),
        locationId: z.string().optional().describe("Optional location filter"),
      },
    },
    async ({ from, to, locationId }) => {
      const data = await getDailyBreakdown({
        from: new Date(from),
        to: new Date(to),
        locationId,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 2. sales_compare_period
  // ──────────────────────────────────────────────────────────────────────────

  registerTool(
    "sales_compare_period",
    {
      title: "Compare sales periods",
      description:
        "Compare two date ranges side-by-side with absolute and percentage deltas for revenue, units sold, and transaction count.",
      inputSchema: {
        rangeA: z.object({
          from: z.string().describe("ISO date (inclusive)"),
          to: z.string().describe("ISO date (exclusive)"),
        }),
        rangeB: z.object({
          from: z.string().describe("ISO date (inclusive)"),
          to: z.string().describe("ISO date (exclusive)"),
        }),
        locationId: z.string().optional().describe("Optional location filter"),
      },
    },
    async ({ rangeA, rangeB, locationId }) => {
      const data = await getComparePeriodData({
        rangeA: {
          from: new Date(rangeA.from),
          to: new Date(rangeA.to),
        },
        rangeB: {
          from: new Date(rangeB.from),
          to: new Date(rangeB.to),
        },
        locationId,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 3. sales_by_product
  // ──────────────────────────────────────────────────────────────────────────

  registerTool(
    "sales_by_product",
    {
      title: "Top products by sales",
      description:
        "Ranked list of top products by revenue or units sold, with percentage of total.",
      inputSchema: {
        from: z.string().describe("ISO date (inclusive)"),
        to: z.string().describe("ISO date (exclusive)"),
        topN: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(5)
          .describe("Number of top products to return"),
        sortBy: z
          .enum(["revenue", "units"])
          .default("revenue")
          .describe("Sort by revenue or units"),
        locationId: z.string().optional().describe("Optional location filter"),
      },
    },
    async ({ from, to, topN, sortBy, locationId }) => {
      const data = await getProductBreakdown({
        from: new Date(from),
        to: new Date(to),
        topN: topN ?? 5,
        sortBy: sortBy ?? "revenue",
        locationId,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 4. sales_velocity
  // ──────────────────────────────────────────────────────────────────────────

  registerTool(
    "sales_velocity",
    {
      title: "Sales velocity (units per day)",
      description:
        "How fast products are selling: units sold per day over a rolling window. If no variation IDs specified, returns top 100 fastest movers.",
      inputSchema: {
        windowDays: z
          .number()
          .int()
          .min(1)
          .max(90)
          .default(7)
          .describe("Rolling window in days"),
        variationIds: z
          .array(z.string().uuid())
          .optional()
          .describe("Optional filter to specific product variation IDs"),
      },
    },
    async ({ windowDays, variationIds }) => {
      const data = await getVelocityMetrics({
        windowDays: windowDays ?? 7,
        variationIds,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 5. sales_last_sold
  // ──────────────────────────────────────────────────────────────────────────

  registerTool(
    "sales_last_sold",
    {
      title: "Last sale date by variation",
      description:
        "For each product variation, find the most recent sale date (or null if never sold).",
      inputSchema: {
        variationIds: z
          .array(z.string().uuid())
          .min(1)
          .max(200)
          .describe("Product variation IDs to check"),
      },
    },
    async ({ variationIds }) => {
      const data = await getLastSoldDates({ variationIds });

      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  registerTool(
    "sales_summary",
    {
      title: "Sales summary",
      description:
        "Aggregate sales totals/count for the authenticated tenant within a date range.",
      inputSchema: {
        from: z
          .string()
          .optional()
          .describe("ISO date lower bound (inclusive)"),
        to: z.string().optional().describe("ISO date upper bound (exclusive)"),
        locationId: z.string().optional(),
      },
    },
    async ({ from, to, locationId }) => {
      const where: Record<string, unknown> = { isLatest: true };
      if (locationId) where.locationId = locationId;
      if (from || to) {
        where.createdAt = {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lt: new Date(to) } : {}),
        };
      }

      const [agg, count] = await Promise.all([
        prisma.sale.aggregate({
          where,
          _sum: { total: true, subtotal: true, discount: true },
        }),
        prisma.sale.count({ where }),
      ]);

      const summary = {
        tenantSlug: authCtx.tenantSlug,
        count,
        total: agg._sum.total?.toString() ?? "0",
        subtotal: agg._sum.subtotal?.toString() ?? "0",
        discount: agg._sum.discount?.toString() ?? "0",
        range: {
          from: from ?? null,
          to: to ?? null,
          locationId: locationId ?? null,
        },
      };

      return {
        content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      };
    },
  );

  registerTool(
    "create_sale",
    {
      title: "Create sale",
      description:
        "Record a new POS sale at a showroom location. Items reference product variation IDs; payments are optional and use uppercase method codes like CASH, CARD, ESEWA. Returns the created sale with computed totals.",
      inputSchema: {
        locationId: z.string().uuid().describe("Showroom location id"),
        memberPhone: z
          .string()
          .optional()
          .describe(
            "Member phone to find or create a member; converts sale to MEMBER type",
          ),
        memberName: z
          .string()
          .optional()
          .describe("Required when memberPhone refers to a new member"),
        contactId: z
          .string()
          .uuid()
          .optional()
          .describe("Optional CRM contact id to attribute the sale to"),
        isCreditSale: z.boolean().optional().default(false),
        notes: z.string().optional(),
        items: z
          .array(
            z.object({
              variationId: z.string().uuid(),
              subVariationId: z.string().uuid().nullable().optional(),
              quantity: z.number().int().positive(),
              manualDiscountPercent: z.number().min(0).max(100).optional(),
              manualDiscountAmount: z.number().min(0).optional(),
              discountReason: z.string().max(500).optional(),
              promoCode: z.string().optional(),
            }),
          )
          .min(1, "At least one item is required"),
        payments: z
          .array(
            z.object({
              method: z
                .string()
                .regex(/^[A-Z0-9_]+$/, "Use uppercase codes like CASH, CARD"),
              amount: z.number().min(0),
            }),
          )
          .optional(),
      },
    },
    async (dto) => {
      try {
        const sale = await createSale(
          {
            tenantId: authCtx.tenantId,
            userId: authCtx.userId,
            userRole: authCtx.userRole,
          },
          dto as Parameters<typeof createSale>[1],
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  id: sale.id,
                  saleCode: sale.saleCode,
                  type: sale.type,
                  isCreditSale: sale.isCreditSale,
                  locationId: sale.locationId,
                  memberId: sale.memberId,
                  contactId: sale.contactId,
                  subtotal: sale.subtotal?.toString(),
                  discount: sale.discount?.toString(),
                  promoDiscount: sale.promoDiscount?.toString(),
                  total: sale.total?.toString(),
                  createdAt: sale.createdAt,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: err?.message ?? "Sale creation failed",
                statusCode: err?.statusCode ?? 500,
              }),
            },
          ],
        };
      }
    },
  );
}
