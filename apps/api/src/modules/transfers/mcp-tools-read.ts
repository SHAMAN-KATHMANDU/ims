/**
 * MCP read tools — Transfers module.
 * Mirrors GET /transfers and GET /transfers/:id.
 * Note service arg order: findAll(tenantId, query), findById(tenantId, id).
 * Approve/transit/complete/cancel state changes stay REST/admin-UI only.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import transferService from "@/modules/transfers/transfer.service";
import {
  GetAllTransfersQuerySchema,
  type GetAllTransfersQuery,
} from "@/modules/transfers/transfer.schema";

export function registerTransfersReadMcpTools(
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
    "list_transfers",
    {
      title: "List transfers",
      description:
        "List inventory transfers between locations, paginated with status/location/date filters. Mirrors GET /transfers. Statuses: PENDING, APPROVED, IN_TRANSIT, COMPLETED, CANCELLED.",
      inputSchema: GetAllTransfersQuerySchema.shape,
    },
    async (query) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.TRANSFERS.VIEW");
        const result = await transferService.findAll(
          authCtx.tenantId,
          query as GetAllTransfersQuery,
        );
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "list_transfers failed");
      }
    },
  );

  registerTool(
    "get_transfer",
    {
      title: "Get transfer",
      description:
        "Fetch a single inventory transfer by id, including its line items. Mirrors GET /transfers/:id.",
      inputSchema: { id: z.string().uuid().describe("Target transfer id") },
    },
    async ({ id }: { id: string }) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.TRANSFERS.VIEW");
        const transfer = await transferService.findById(authCtx.tenantId, id);
        return mcpJsonResponse(transfer);
      } catch (err) {
        return mcpErrorResponse(err, "get_transfer failed");
      }
    },
  );
}
