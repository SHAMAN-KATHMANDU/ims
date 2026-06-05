/**
 * MCP update/read tools — Locations module.
 * Mirrors GET /locations, GET /locations/:id, PUT /locations/:id.
 * Note service arg order: findById(id, tenantId), update(id, data, tenantId).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import locationService from "@/modules/locations/location.service";
import {
  UpdateLocationSchema,
  type UpdateLocationDto,
} from "@/modules/locations/location.schema";

export function registerLocationsUpdateMcpTools(
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
    "list_locations",
    {
      title: "List locations",
      description:
        "[LOOKUP-READ] List warehouse/showroom locations for the tenant. Use to find a location id before sales/transfers/inventory or to update it.",
      inputSchema: {
        search: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async ({ search, limit }: { search?: string; limit?: number }) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.LOCATIONS.VIEW");
        const result = await locationService.findAll(authCtx.tenantId, {
          ...(search ? { search } : {}),
          ...(limit ? { limit } : {}),
        });
        return mcpJsonResponse(result);
      } catch (err) {
        return mcpErrorResponse(err, "list_locations failed");
      }
    },
  );

  registerTool(
    "get_location",
    {
      title: "Get location",
      description: "Fetch a single location by id.",
      inputSchema: { id: z.string().uuid().describe("Target location id") },
    },
    async ({ id }: { id: string }) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.LOCATIONS.VIEW");
        const location = await locationService.findById(id, authCtx.tenantId);
        return mcpJsonResponse(location);
      } catch (err) {
        return mcpErrorResponse(err, "get_location failed");
      }
    },
  );

  registerTool(
    "update_location",
    {
      title: "Update location",
      description:
        "Update a location. Mirrors PUT /locations/:id. Only provided fields change.",
      inputSchema: {
        id: z.string().uuid().describe("Target location id"),
        ...UpdateLocationSchema.shape,
      },
    },
    async (args: { id: string } & UpdateLocationDto) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.LOCATIONS.UPDATE");
        const { id, ...data } = args;
        const location = await locationService.update(
          id,
          data as UpdateLocationDto,
          authCtx.tenantId,
        );
        return mcpJsonResponse(location);
      } catch (err) {
        return mcpErrorResponse(err, "update_location failed");
      }
    },
  );
}
