/**
 * MCP read tools — Sales module (record reads; analytics live in mcp-tools.ts).
 * Mirrors GET /sales and GET /sales/:id.
 * getSaleById relies on the ambient tenant scope (runWithTenant from the MCP
 * middleware + Prisma tenant extension), same as the REST controller.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import saleService from "@/modules/sales/sale.service";
import {
  GetAllSalesQuerySchema,
  type GetAllSalesQueryDto,
} from "@/modules/sales/sale.schema";

export function registerSalesReadMcpTools(
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
    "list_sales",
    {
      title: "List sales",
      description:
        "List sale records, paginated, with search and location/creator/type/date filters. Mirrors GET /sales. For aggregates use the sales_* analytics tools instead.",
      inputSchema: GetAllSalesQuerySchema.shape,
    },
    async (query) => {
      try {
        await assertMcpPermission(authCtx, "SALES.SALES.VIEW");
        const dto = query as GetAllSalesQueryDto;
        const result = await saleService.getAllSales({
          ...dto,
          page: dto.page ?? 1,
          limit: dto.limit ?? 10,
          sortBy: dto.sortBy ?? "createdAt",
          sortOrder: dto.sortOrder ?? "desc",
          userRole: authCtx.userRole,
        });
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "list_sales failed");
      }
    },
  );

  registerTool(
    "get_sale",
    {
      title: "Get sale",
      description:
        "Fetch a single sale by id, including line items and payments. Mirrors GET /sales/:id.",
      inputSchema: { id: z.string().uuid().describe("Target sale id") },
    },
    async ({ id }: { id: string }) => {
      try {
        await assertMcpPermission(authCtx, "SALES.SALES.VIEW");
        const sale = await saleService.getSaleById(id);
        return mcpJsonResponse(sale);
      } catch (err) {
        return mcpErrorResponse(err, "get_sale failed");
      }
    },
  );
}
