/**
 * MCP update/read tools — Deals module.
 *
 * Mirrors PUT /deals/:id and GET /deals/:id. update_deal accepts partial fields
 * and runs the same reference validation as create via deal.service.ts:
 * contactId/memberId/companyId/assignedToId must exist, and stage must be a
 * valid stage of the (target) pipeline — unknown values are rejected with the
 * list of valid options.
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
  UpdateDealSchema,
  type UpdateDealDto,
} from "@/modules/deals/deal.schema";

export function registerDealsUpdateMcpTools(
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
    "get_deal",
    {
      title: "Get deal",
      description:
        "Fetch a single deal by id (with pipeline, stage, contact, line items). Use list_deals to find the id.",
      inputSchema: {
        id: z.string().uuid().describe("Target deal id"),
      },
    },
    async ({ id }: { id: string }) => {
      try {
        await assertMcpPermission(authCtx, "CRM.DEALS.VIEW");
        const deal = await dealService.getById(authCtx.tenantId, id);
        return mcpJsonResponse(deal);
      } catch (err) {
        return mcpErrorResponse(err, "get_deal failed");
      }
    },
  );

  registerTool(
    "update_deal",
    {
      title: "Update deal",
      description:
        "Update an existing deal. Mirrors PUT /deals/:id. Only provided fields change. " +
        "References are validated: contactId/memberId/companyId/assignedToId must exist; " +
        "stage must be a valid stage of the deal's (or target) pipeline — call list_pipelines / get_deal first. " +
        "Set status to WON/LOST to close; pipelineId to move pipelines.",
      inputSchema: {
        id: z.string().uuid().describe("Target deal id"),
        ...UpdateDealSchema.shape,
      },
    },
    async (args: { id: string } & UpdateDealDto) => {
      try {
        await assertMcpPermission(authCtx, "CRM.DEALS.UPDATE");
        const { id, ...data } = args;
        const deal = await dealService.update(
          authCtx.tenantId,
          id,
          data as UpdateDealDto,
          authCtx.userId,
        );
        return mcpJsonResponse(deal);
      } catch (err) {
        return mcpErrorResponse(err, "update_deal failed");
      }
    },
  );
}
