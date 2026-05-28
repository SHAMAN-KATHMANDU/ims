/**
 * MCP analytics tools for the Inventory module.
 *
 * Two tools: inventory_snapshot (multi-filter inventory view) and
 * inventory_days_to_stockout (velocity-based reorder planning).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import prisma from "@/config/prisma";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";

export function registerInventoryAnalyticsTools(
  server: McpServer,
  authCtx: McpAuthContext,
): void {
  // Alias registerTool to work around TS2589 with strict null checks
  const registerTool = server.registerTool.bind(server) as (
    name: string,
    config: {
      title?: string;
      description?: string;
      inputSchema?: Record<string, z.ZodTypeAny>;
    },
    handler: (args: any) => Promise<unknown> | unknown,
  ) => unknown;

  // ─── inventory_snapshot ────────────────────────────────────────────────

  registerTool(
    "inventory_snapshot",
    {
      title: "Inventory snapshot",
      description:
        "View inventory levels with multi-filter support (all, below_reorder, overstocked, dead stock). Returns variation, product, quantity, reorder level, and last restock timestamp. Note: lastRestockAt is proxied from LocationInventory.updatedAt; there is no dedicated restock table.",
      inputSchema: {
        filter: z
          .enum(["all", "below_reorder", "overstocked", "dead"])
          .default("all")
          .describe(
            "Filter type: all (no filter), below_reorder (qty < threshold), overstocked (qty > threshold*3), dead (zero units sold in 14d)",
          ),
        locationId: z
          .string()
          .optional()
          .describe(
            "Optional location id; if provided, return LocationInventory quantities for that location only",
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(500)
          .default(100)
          .describe("Max results to return (1-500, default 100)"),
        cursor: z
          .string()
          .optional()
          .describe(
            "Pagination cursor: variationId to paginate after (keyset-style)",
          ),
      },
    },
    async ({ filter, locationId, limit, cursor }) => {
      try {
        const take = limit ?? 100;

        // ─── Determine quantity source ──────────────────────────────────
        // If locationId provided, use LocationInventory; else use ProductVariation.stockQuantity.

        if (locationId) {
          // Per-location query: LocationInventory with filters
          const rows = await prisma.locationInventory.findMany({
            where: {
              locationId,
              ...(cursor ? { variationId: { gt: cursor } } : {}),
            },
            take: take + 1, // +1 to detect more results
            orderBy: { variationId: "asc" },
            select: {
              variationId: true,
              quantity: true,
              updatedAt: true,
              variation: {
                select: {
                  id: true,
                  stockQuantity: true,
                  lowStockThreshold: true,
                  product: {
                    select: {
                      id: true,
                      name: true,
                      imsCode: true,
                    },
                  },
                },
              },
            },
          });

          // Filter based on filter parameter
          let filtered = rows.map((row) => ({
            variationId: row.variationId,
            productId: row.variation.product.id,
            productName: row.variation.product.name,
            imsCode: row.variation.product.imsCode,
            qty: row.quantity,
            reorderLevel: row.variation.lowStockThreshold ?? 0,
            lastRestockAt: row.updatedAt,
          }));

          if (filter === "below_reorder") {
            filtered = filtered.filter(
              (item) => item.qty < item.reorderLevel && item.reorderLevel > 0,
            );
          } else if (filter === "overstocked") {
            filtered = filtered.filter(
              (item) =>
                item.qty > item.reorderLevel * 3 && item.reorderLevel > 0,
            );
          } else if (filter === "dead") {
            // Dead stock: qty > 0 but zero units sold in last 14 days
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - 14);

            const soldVariationIds = await prisma.saleItem.findMany({
              where: {
                sale: {
                  isLatest: true,
                  createdAt: { gte: cutoff },
                },
              },
              distinct: ["variationId"],
              select: { variationId: true },
            });

            const soldSet = new Set(soldVariationIds.map((s) => s.variationId));
            filtered = filtered.filter(
              (item) => item.qty > 0 && !soldSet.has(item.variationId),
            );
          }

          const hasMore = filtered.length > take;
          const result = filtered.slice(0, take);
          const nextCursor =
            hasMore && result.length > 0
              ? result[result.length - 1].variationId
              : null;

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    locationId,
                    filter,
                    count: result.length,
                    hasMore,
                    nextCursor,
                    items: result,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } else {
          // Rolled-up query: ProductVariation with aggregate LocationInventory
          const variations = await prisma.productVariation.findMany({
            where: {
              ...(cursor ? { id: { gt: cursor } } : {}),
            },
            take: take + 1,
            orderBy: { id: "asc" },
            select: {
              id: true,
              stockQuantity: true,
              lowStockThreshold: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  imsCode: true,
                },
              },
              locationInventory: {
                select: { updatedAt: true },
                orderBy: { updatedAt: "desc" },
                take: 1,
              },
            },
          });

          // Map and filter
          let mapped = variations.map((v) => ({
            variationId: v.id,
            productId: v.product.id,
            productName: v.product.name,
            imsCode: v.product.imsCode,
            qty: v.stockQuantity,
            reorderLevel: v.lowStockThreshold ?? 0,
            lastRestockAt:
              v.locationInventory.length > 0
                ? v.locationInventory[0].updatedAt
                : null,
          }));

          if (filter === "below_reorder") {
            mapped = mapped.filter(
              (item) => item.qty < item.reorderLevel && item.reorderLevel > 0,
            );
          } else if (filter === "overstocked") {
            mapped = mapped.filter(
              (item) =>
                item.qty > item.reorderLevel * 3 && item.reorderLevel > 0,
            );
          } else if (filter === "dead") {
            // Dead stock: qty > 0 but zero units sold in last 14 days
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - 14);

            const soldVariationIds = await prisma.saleItem.findMany({
              where: {
                sale: {
                  isLatest: true,
                  createdAt: { gte: cutoff },
                },
              },
              distinct: ["variationId"],
              select: { variationId: true },
            });

            const soldSet = new Set(soldVariationIds.map((s) => s.variationId));
            mapped = mapped.filter(
              (item) => item.qty > 0 && !soldSet.has(item.variationId),
            );
          }

          const hasMore = mapped.length > take;
          const result = mapped.slice(0, take);
          const nextCursor =
            hasMore && result.length > 0
              ? result[result.length - 1].variationId
              : null;

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    filter,
                    count: result.length,
                    hasMore,
                    nextCursor,
                    items: result,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: err?.message ?? "inventory_snapshot failed",
                statusCode: err?.statusCode ?? 500,
              }),
            },
          ],
        };
      }
    },
  );

  // ─── inventory_days_to_stockout ────────────────────────────────────────

  registerTool(
    "inventory_days_to_stockout",
    {
      title: "Inventory days to stockout",
      description:
        "Calculate days remaining until stockout based on sales velocity. Includes avgPerDay (from last N days), daysRemaining (qty / avgPerDay), and severity (critical < 3 days, urgent 3-7, ok >= 7, no_movement if zero velocity). Filter by location and/or specific variations.",
      inputSchema: {
        locationId: z
          .string()
          .optional()
          .describe(
            "Optional location id; if provided, use that location's qty",
          ),
        windowDays: z
          .number()
          .int()
          .min(1)
          .max(90)
          .default(7)
          .describe(
            "Lookback window in days to compute average velocity (1-90, default 7)",
          ),
        variationIds: z
          .array(z.string())
          .optional()
          .describe(
            "Optional array of variationIds to scope results; if omitted, include all variations with qty > 0",
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(500)
          .default(100)
          .describe("Max results to return (default 100)"),
      },
    },
    async ({ locationId, windowDays, variationIds, limit }) => {
      try {
        const take = limit ?? 100;
        const window = windowDays ?? 7;

        // Compute cutoff date for velocity window
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - window);

        // ─── Fetch sales velocity (units per variation in window) ──────
        const variationFilter =
          variationIds && variationIds.length > 0
            ? `AND si."variation_id" = ANY(ARRAY[${variationIds.map((id) => `'${id}'`).join(",")}])`
            : "";

        const velocityData = await prisma.$queryRaw<
          Array<{
            variationId: string;
            totalQuantity: bigint;
          }>
        >(
          `
          SELECT
            si."variation_id" as "variationId",
            COALESCE(SUM(si."quantity"), 0) as "totalQuantity"
          FROM "sale_items" si
          JOIN "sales" s ON si."sale_id" = s."sale_id"
          WHERE
            s."is_latest" = true
            AND s."created_at" >= $1
            ${variationFilter}
          GROUP BY si."variation_id"
          ` as any,
          cutoff,
        );

        const velocityMap = new Map(
          velocityData.map((row) => [
            row.variationId,
            Number(row.totalQuantity),
          ]),
        );

        // ─── Fetch quantities (per location or rolled up) ──────────────
        let quantityData;

        if (locationId) {
          quantityData = await prisma.locationInventory.findMany({
            where: {
              locationId,
              quantity: { gt: 0 },
              ...(variationIds && variationIds.length > 0
                ? { variationId: { in: variationIds } }
                : {}),
            },
            take,
            orderBy: { variationId: "asc" },
            select: {
              variationId: true,
              quantity: true,
              variation: {
                select: {
                  product: {
                    select: {
                      name: true,
                      imsCode: true,
                    },
                  },
                },
              },
            },
          });
        } else {
          quantityData = await prisma.productVariation.findMany({
            where: {
              stockQuantity: { gt: 0 },
              ...(variationIds && variationIds.length > 0
                ? { id: { in: variationIds } }
                : {}),
            },
            take,
            orderBy: { id: "asc" },
            select: {
              id: true,
              stockQuantity: true,
              product: {
                select: {
                  name: true,
                  imsCode: true,
                },
              },
            },
          });
        }

        // ─── Compute daysRemaining and severity ─────────────────────────
        const results = quantityData.map((item) => {
          const variationId = locationId ? item.variationId : (item as any).id;
          const qty = locationId ? item.quantity : (item as any).stockQuantity;
          const totalSold = velocityMap.get(variationId) ?? 0;
          const avgPerDay = totalSold / window;

          let daysRemaining: number | null = null;
          let severity: string;

          if (avgPerDay === 0) {
            severity = "no_movement";
          } else {
            daysRemaining = Math.round((qty / avgPerDay) * 10) / 10; // 1 decimal
            if (daysRemaining < 3) {
              severity = "critical";
            } else if (daysRemaining < 7) {
              severity = "urgent";
            } else {
              severity = "ok";
            }
          }

          return {
            variationId,
            productName: item.variation.product.name,
            imsCode: item.variation.product.imsCode,
            qty,
            avgPerDay: Math.round(avgPerDay * 100) / 100, // 2 decimals
            daysRemaining,
            severity,
          };
        });

        // Sort by daysRemaining ascending (nulls last)
        results.sort((a, b) => {
          if (a.daysRemaining === null && b.daysRemaining === null) return 0;
          if (a.daysRemaining === null) return 1;
          if (b.daysRemaining === null) return -1;
          return a.daysRemaining - b.daysRemaining;
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  locationId: locationId ?? null,
                  windowDays: window,
                  count: results.length,
                  items: results,
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
                error: err?.message ?? "inventory_days_to_stockout failed",
                statusCode: err?.statusCode ?? 500,
              }),
            },
          ],
        };
      }
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 3. inventory_levels (originally inlined in mcp.server.ts)
  // ──────────────────────────────────────────────────────────────────────────

  registerTool(
    "inventory_levels",
    {
      title: "Inventory levels",
      description:
        "Return per-location inventory quantities for a product, scoped to the authenticated tenant.",
      inputSchema: {
        productId: z.string().describe("Product id"),
      },
    },
    async ({ productId }) => {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          imsCode: true,
          variations: {
            select: {
              id: true,
              stockQuantity: true,
              locationInventory: {
                select: {
                  quantity: true,
                  location: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      });

      if (!product) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: "product_not_found", productId }),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(product, null, 2) }],
      };
    },
  );
}
