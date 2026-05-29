/**
 * MCP Create Tools — Transfers Module
 *
 * Mirrors POST /transfers. CreateTransferSchema is .refine()-wrapped, so we
 * re-declare the input shape and validate against the full schema in the handler.
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
  CreateTransferSchema,
  type CreateTransferDto,
} from "@/modules/transfers/transfer.schema";

export function registerTransfersCreateMcpTools(
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

  const inputShape = {
    fromLocationId: z.string().uuid().describe("Source location id"),
    toLocationId: z
      .string()
      .uuid()
      .describe("Destination location id (must differ from source)"),
    items: z
      .array(
        z.object({
          variationId: z.string().uuid(),
          subVariationId: z.string().uuid().nullable().optional(),
          quantity: z.number().int().positive(),
        }),
      )
      .min(1),
    notes: z.string().max(1000).optional(),
  };

  registerTool(
    "create_transfer",
    {
      title: "Create stock transfer",
      description:
        "Move inventory between two locations. Mirrors POST /transfers.",
      inputSchema: inputShape,
    },
    async (raw) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.TRANSFERS.CREATE");
        const dto = CreateTransferSchema.parse(raw) as CreateTransferDto;
        const transfer = await transferService.create(
          authCtx.tenantId,
          authCtx.userId,
          dto,
        );
        return mcpJsonResponse(transfer);
      } catch (err) {
        return mcpErrorResponse(err, "create_transfer failed");
      }
    },
  );
}
