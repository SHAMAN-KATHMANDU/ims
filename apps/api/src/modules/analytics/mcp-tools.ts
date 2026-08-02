/**
 * MCP analytics tools — Analytics module (read-only dashboard metrics).
 * Mirrors the GET /analytics/* endpoints; every REST route is gated by
 * REPORTS.ANALYTICS.VIEW, so all tools use that key. Service methods take a
 * raw query record plus role/user context for row-level visibility.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import analyticsService from "@/modules/analytics/analytics.service";
import { AnalyticsQuerySchema } from "@/modules/analytics/analytics.schema";

export function registerAnalyticsMcpTools(
  server: McpServer,
  authCtx: McpAuthContext,
) {
  const registerTool = server.registerTool.bind(server) as (
    name: string,
    config: {
      title?: string;
      description?: string;
      inputSchema?: Record<string, z.ZodTypeAny>;
    },
    handler: (args: any) => Promise<unknown> | unknown,
  ) => unknown;

  const PERMISSION = "REPORTS.ANALYTICS.VIEW";

  registerTool(
    "analytics_overview",
    {
      title: "Analytics overview",
      description:
        "High-level workspace overview metrics. Mirrors GET /analytics/overview.",
      inputSchema: {},
    },
    async () => {
      try {
        await assertMcpPermission(authCtx, PERMISSION);
        const data = await analyticsService.getOverview(authCtx.tenantId);
        return mcpJsonResponse(data);
      } catch (err) {
        return mcpErrorResponse(err, "analytics_overview failed");
      }
    },
  );

  registerTool(
    "analytics_sales_revenue",
    {
      title: "Sales revenue analytics",
      description:
        "Revenue analytics with date/location/type filters. Mirrors GET /analytics/sales-revenue. For raw sale records use list_sales; for quick aggregates use sales_summary.",
      inputSchema: AnalyticsQuerySchema.shape,
    },
    async (query) => {
      try {
        await assertMcpPermission(authCtx, PERMISSION);
        const data = await analyticsService.getSalesRevenue(
          (query ?? {}) as Record<string, unknown>,
          authCtx.userRole,
          authCtx.userId,
          authCtx.tenantId,
        );
        return mcpJsonResponse(data);
      } catch (err) {
        return mcpErrorResponse(err, "analytics_sales_revenue failed");
      }
    },
  );

  registerTool(
    "analytics_inventory_ops",
    {
      title: "Inventory operations analytics",
      description:
        "Inventory operations analytics (adjustments, transfers, stock movement) with filters. Mirrors GET /analytics/inventory-ops.",
      inputSchema: AnalyticsQuerySchema.shape,
    },
    async (query) => {
      try {
        await assertMcpPermission(authCtx, PERMISSION);
        const data = await analyticsService.getInventoryOps(
          (query ?? {}) as Record<string, unknown>,
          authCtx.tenantId,
        );
        return mcpJsonResponse(data);
      } catch (err) {
        return mcpErrorResponse(err, "analytics_inventory_ops failed");
      }
    },
  );

  registerTool(
    "analytics_customers_promos",
    {
      title: "Customers & promos analytics",
      description:
        "Customer and promo performance analytics with filters. Mirrors GET /analytics/customers-promos.",
      inputSchema: AnalyticsQuerySchema.shape,
    },
    async (query) => {
      try {
        await assertMcpPermission(authCtx, PERMISSION);
        const data = await analyticsService.getCustomersPromos(
          (query ?? {}) as Record<string, unknown>,
          authCtx.userRole,
          authCtx.userId,
          authCtx.tenantId,
        );
        return mcpJsonResponse(data);
      } catch (err) {
        return mcpErrorResponse(err, "analytics_customers_promos failed");
      }
    },
  );
}
