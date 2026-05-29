/**
 * MCP Create Tools — Promos Module
 *
 * Mirrors POST /promos.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import promoService from "@/modules/promos/promo.service";
import {
  CreatePromoSchema,
  type CreatePromoDto,
} from "@/modules/promos/promo.schema";

export function registerPromosCreateMcpTools(
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
    "create_promo",
    {
      title: "Create promo code",
      description:
        "Create a promo code with a value (percentage or flat) and optional product/category targeting. Mirrors POST /promos.",
      inputSchema: CreatePromoSchema.shape,
    },
    async (dto) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.PROMOS.CREATE");
        const promo = await promoService.create(
          authCtx.tenantId,
          dto as CreatePromoDto,
        );
        return mcpJsonResponse(promo);
      } catch (err) {
        return mcpErrorResponse(err, "create_promo failed");
      }
    },
  );
}
