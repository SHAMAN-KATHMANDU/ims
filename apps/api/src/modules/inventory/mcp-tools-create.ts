/**
 * MCP Create Tools — Inventory Module
 *
 * Stock mutation tools that mirror PUT /inventory/adjust and PUT /inventory/set.
 * Named with create-tool semantics so MCP clients see them alongside other
 * mutations. AsyncLocalStorage scoping is provided by the surrounding mcp
 * middleware (runWithTenant).
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
import {
  AdjustInventorySchema,
  SetInventorySchema,
  type AdjustInventoryDto,
  type SetInventoryDto,
} from "@/modules/inventory/inventory.schema";

export function registerInventoryCreateMcpTools(
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
    "adjust_inventory",
    {
      title: "Adjust inventory (delta)",
      description:
        "Apply a signed delta to a variation's stock at a location. Positive adds, negative subtracts. Mirrors PUT /inventory/adjust.",
      inputSchema: AdjustInventorySchema.shape,
    },
    async (dto) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.PRODUCTS.ADJUST_STOCK");
        const result = await inventoryService.adjustInventory(
          dto as AdjustInventoryDto,
        );
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "adjust_inventory failed");
      }
    },
  );

  registerTool(
    "set_inventory",
    {
      title: "Set inventory (absolute)",
      description:
        "Set a variation's stock at a location to an exact quantity. Mirrors PUT /inventory/set.",
      inputSchema: SetInventorySchema.shape,
    },
    async (dto) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.PRODUCTS.ADJUST_STOCK");
        const result = await inventoryService.setInventory(
          dto as SetInventoryDto,
        );
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "set_inventory failed");
      }
    },
  );
}
