/**
 * MCP server factory for IMS.
 *
 * One McpServer per request (stateless transport pattern). Domain tools are
 * co-located with their owning modules (products/, sales/, crm/, inventory/,
 * reports/); this file is a thin orchestrator that wires them together.
 *
 * Tenant scoping flows through Prisma AsyncLocalStorage — see config/prisma.ts.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getVersion } from "@/config/version";
import { registerProductsMcpTools } from "@/modules/products/mcp-tools";
import { registerSalesAnalyticsTools } from "@/modules/sales/mcp-tools";
import { registerInventoryAnalyticsTools } from "@/modules/inventory/mcp-tools";
import { registerCrmAnalyticsTools } from "@/modules/crm/mcp-tools";
import { registerReportTools } from "@/modules/reports/mcp-tools";
import { registerYantraPrompts } from "./prompts";

export interface McpAuthContext {
  tenantId: string;
  tenantSlug: string;
  userId: string;
  userRole?: string;
}

export function createMcpServer(authCtx: McpAuthContext): McpServer {
  const server = new McpServer({
    name: "ims-mcp",
    version: getVersion(),
  });

  registerProductsMcpTools(server, authCtx);
  registerSalesAnalyticsTools(server, authCtx);
  registerInventoryAnalyticsTools(server, authCtx);
  registerCrmAnalyticsTools(server, authCtx);
  registerReportTools(server, authCtx);

  registerYantraPrompts(server);

  return server;
}
