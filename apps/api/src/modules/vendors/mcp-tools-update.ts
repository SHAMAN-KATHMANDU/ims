/**
 * MCP update/read tools — Vendors module.
 * Mirrors GET /vendors, GET /vendors/:id, PUT /vendors/:id.
 * Note service arg order: findById(id, tenantId), update(id, tenantId, data).
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
  UpdateVendorSchema,
  type UpdateVendorDto,
} from "@/modules/vendors/vendor.schema";

export function registerVendorsUpdateMcpTools(
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
    "list_vendors",
    {
      title: "List vendors",
      description:
        "[LOOKUP-READ] List suppliers/vendors for the tenant. Use to find a vendor before assigning it to a product or to update it.",
      inputSchema: {
        search: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async ({ search, limit }: { search?: string; limit?: number }) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.VENDORS.VIEW");
        const result = await vendorService.findAll(authCtx.tenantId, {
          ...(search ? { search } : {}),
          ...(limit ? { limit } : {}),
        });
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "list_vendors failed");
      }
    },
  );

  registerTool(
    "get_vendor",
    {
      title: "Get vendor",
      description: "Fetch a single vendor by id.",
      inputSchema: { id: z.string().uuid().describe("Target vendor id") },
    },
    async ({ id }: { id: string }) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.VENDORS.VIEW");
        const vendor = await vendorService.findById(id, authCtx.tenantId);
        return mcpJsonResponse(vendor);
      } catch (err) {
        return mcpErrorResponse(err, "get_vendor failed");
      }
    },
  );

  registerTool(
    "update_vendor",
    {
      title: "Update vendor",
      description:
        "Update a vendor. Mirrors PUT /vendors/:id. Only provided fields change.",
      inputSchema: {
        id: z.string().uuid().describe("Target vendor id"),
        ...UpdateVendorSchema.shape,
      },
    },
    async (args: { id: string } & UpdateVendorDto) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.VENDORS.UPDATE");
        const { id, ...data } = args;
        const vendor = await vendorService.update(
          id,
          authCtx.tenantId,
          data as UpdateVendorDto,
        );
        return mcpJsonResponse(vendor);
      } catch (err) {
        return mcpErrorResponse(err, "update_vendor failed");
      }
    },
  );
}
