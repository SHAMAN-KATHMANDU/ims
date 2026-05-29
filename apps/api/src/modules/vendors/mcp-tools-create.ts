/**
 * MCP Create Tools — Vendors Module
 *
 * Mirrors POST /vendors.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import vendorService from "@/modules/vendors/vendor.service";
import {
  CreateVendorSchema,
  type CreateVendorDto,
} from "@/modules/vendors/vendor.schema";

export function registerVendorsCreateMcpTools(
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
    "create_vendor",
    {
      title: "Create vendor",
      description: "Create a supplier/vendor record. Mirrors POST /vendors.",
      inputSchema: CreateVendorSchema.shape,
    },
    async (dto) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.VENDORS.CREATE");
        const vendor = await vendorService.create(
          authCtx.tenantId,
          dto as CreateVendorDto,
        );
        return mcpJsonResponse(vendor);
      } catch (err) {
        return mcpErrorResponse(err, "create_vendor failed");
      }
    },
  );
}
