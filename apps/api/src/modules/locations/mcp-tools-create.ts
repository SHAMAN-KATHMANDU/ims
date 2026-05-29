/**
 * MCP Create Tools — Locations Module
 *
 * Mirrors POST /locations.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import { assertPlanLimitByTenantId } from "@/middlewares/enforcePlanLimits";
import locationService from "@/modules/locations/location.service";
import {
  CreateLocationSchema,
  type CreateLocationDto,
} from "@/modules/locations/location.schema";

export function registerLocationsCreateMcpTools(
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
    "create_location",
    {
      title: "Create location",
      description:
        "Create a warehouse or showroom location. Subject to the tenant's plan locations limit. Mirrors POST /locations.",
      inputSchema: CreateLocationSchema.shape,
    },
    async (dto) => {
      try {
        await assertMcpPermission(authCtx, "INVENTORY.LOCATIONS.CREATE");
        await assertPlanLimitByTenantId(authCtx.tenantId, "locations");
        const location = await locationService.create(
          authCtx.tenantId,
          dto as CreateLocationDto,
        );
        return mcpJsonResponse(location);
      } catch (err) {
        return mcpErrorResponse(err, "create_location failed");
      }
    },
  );
}
