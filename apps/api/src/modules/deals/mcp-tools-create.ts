/**
 * MCP Create Tools — Deals Module
 *
 * Mirrors POST /deals, POST /deals/:id/line-items, POST /deals/:id/convert-to-sale.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import dealService from "@/modules/deals/deal.service";
import {
  CreateDealSchema,
  AddDealLineItemSchema,
  ConvertDealToSaleSchema,
  type CreateDealDto,
  type AddDealLineItemDto,
  type ConvertDealToSaleDto,
} from "@/modules/deals/deal.schema";

export function registerDealsCreateMcpTools(
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
    "create_deal",
    {
      title: "Create deal",
      description:
        "Create a new sales pipeline deal. Mirrors POST /deals. If no pipelineId/stage given, defaults to the tenant's default pipeline and first stage.",
      inputSchema: CreateDealSchema.shape,
    },
    async (dto) => {
      try {
        await assertMcpPermission(authCtx, "CRM.DEALS.CREATE");
        const deal = await dealService.create(
          authCtx.tenantId,
          dto as CreateDealDto,
          authCtx.userId,
        );
        return mcpJsonResponse(deal);
      } catch (err) {
        return mcpErrorResponse(err, "create_deal failed");
      }
    },
  );

  registerTool(
    "add_deal_line_item",
    {
      title: "Add line item to deal",
      description:
        "Attach a product line item (product + variation + quantity + unit price) to an existing deal. Mirrors POST /deals/:id/line-items.",
      inputSchema: {
        dealId: z.string().uuid().describe("Target deal id"),
        ...AddDealLineItemSchema.shape,
      },
    },
    async (args: { dealId: string } & AddDealLineItemDto) => {
      try {
        await assertMcpPermission(authCtx, "CRM.DEALS.CHANGE_VALUE");
        const { dealId, ...data } = args;
        const item = await dealService.addLineItem(
          authCtx.tenantId,
          dealId,
          data,
        );
        return mcpJsonResponse(item);
      } catch (err) {
        return mcpErrorResponse(err, "add_deal_line_item failed");
      }
    },
  );

  registerTool(
    "convert_deal_to_sale",
    {
      title: "Convert deal to sale",
      description:
        "Turn a WON-ready deal into a finalized sale at the given location. Mirrors POST /deals/:id/convert-to-sale.",
      inputSchema: {
        dealId: z.string().uuid().describe("Source deal id"),
        ...ConvertDealToSaleSchema.shape,
      },
    },
    async (args: { dealId: string } & ConvertDealToSaleDto) => {
      try {
        await assertMcpPermission(authCtx, "CRM.DEALS.UPDATE");
        const { dealId, ...data } = args;
        const sale = await dealService.convertToSale(
          authCtx.tenantId,
          dealId,
          authCtx.userId,
          data,
        );
        return mcpJsonResponse(sale);
      } catch (err) {
        return mcpErrorResponse(err, "convert_deal_to_sale failed");
      }
    },
  );
}
