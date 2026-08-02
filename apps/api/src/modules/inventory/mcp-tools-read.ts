/**
 * MCP read tools — Inventory module (single-record reads; analytics live in
 * mcp-tools.ts, mutations in mcp-tools-create.ts).
 * Mirrors GET /inventory/products/:productId/stock and
 * GET /inventory/locations/:locationId. Services resolve the tenant from the
 * ambient runWithTenant scope (getTenantId), same as the REST controllers.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import inventoryService from "@/modules/inventory/inventory.service";

export function registerInventoryReadMcpTools(
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

  registerTool(
    "get_product_stock",
    {
      title: "Get product stock",
      description:
        "Per-location stock for one product across all its variations. Resolve productId via list_products first. For tenant-wide aggregates use inventory_snapshot.",
      inputSchema: {
        productId: z.string().uuid().describe("Target product id"),
      },
    },
    async ({ productId }: { productId: string }) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.PRODUCTS.VIEW");
        const stock = await inventoryService.getProductStock(productId);
        return mcpJsonResponse(stock);
      } catch (err) {
        return mcpErrorResponse(err, "get_product_stock failed");
      }
    },
  );

  registerTool(
    "get_location_inventory",
    {
      title: "Get location inventory",
      description:
        "Paginated inventory levels at one location, filterable by search/category. Resolve locationId via list_locations first.",
      inputSchema: {
        locationId: z.string().uuid().describe("Target location id"),
        page: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).max(100).optional(),
        search: z.string().optional(),
        categoryId: z.string().uuid().optional(),
        sortBy: z.enum(["name", "price", "createdAt"]).optional(),
        sortOrder: z.enum(["asc", "desc"]).optional(),
      },
    },
    async (args: { locationId: string } & Record<string, unknown>) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.PRODUCTS.VIEW");
        const { locationId, ...rawQuery } = args;
        const inventory = await inventoryService.getLocationInventory(
          locationId,
          rawQuery,
        );
        return mcpJsonResponse(inventory);
      } catch (err) {
        return mcpErrorResponse(err, "get_location_inventory failed");
      }
    },
  );
}
