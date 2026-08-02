/**
 * MCP tools — Business Profile module (singleton per tenant).
 * Mirrors GET /business-profile and PUT /business-profile.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";
import {
  assertMcpPermission,
  mcpErrorResponse,
  mcpJsonResponse,
} from "@/modules/mcp/mcp.rbac";
import businessProfileService from "@/modules/business-profile/business-profile.service";
import { UpdateBusinessProfileSchema } from "@/modules/business-profile/business-profile.schema";

export function registerBusinessProfileMcpTools(
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
    "get_business_profile",
    {
      title: "Get business profile",
      description:
        "Fetch the tenant's business profile (branding, contact details, tax id). Mirrors GET /business-profile.",
      inputSchema: {},
    },
    async () => {
      try {
        await assertMcpPermission(authCtx, "SETTINGS.TENANT.VIEW");
        const profile = await businessProfileService.getForTenant(
          authCtx.tenantId,
        );
        return mcpJsonResponse(profile);
      } catch (err) {
        return mcpErrorResponse(err, "get_business_profile failed");
      }
    },
  );

  registerTool(
    "update_business_profile",
    {
      title: "Update business profile",
      description:
        "Update the tenant's business profile. Mirrors PUT /business-profile. Only provided fields change. Fetch it first with get_business_profile.",
      inputSchema: UpdateBusinessProfileSchema.shape,
    },
    async (dto) => {
      try {
        await assertMcpPermission(authCtx, "SETTINGS.TENANT.UPDATE_BRANDING");
        const profile = await businessProfileService.updateForTenant(
          authCtx.tenantId,
          UpdateBusinessProfileSchema.parse(dto),
        );
        return mcpJsonResponse(profile);
      } catch (err) {
        return mcpErrorResponse(err, "update_business_profile failed");
      }
    },
  );
}
