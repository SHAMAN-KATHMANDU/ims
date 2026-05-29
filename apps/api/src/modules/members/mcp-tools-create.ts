/**
 * MCP Create Tools — Members Module
 *
 * Mirrors POST /members. Members are loyalty/account holders, separate from
 * staff users and CRM contacts.
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
import memberService from "@/modules/members/member.service";
import {
  CreateMemberSchema,
  type CreateMemberDto,
} from "@/modules/members/member.schema";

export function registerMembersCreateMcpTools(
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
    "create_member",
    {
      title: "Create member",
      description:
        "Create a loyalty member (identified by phone). Subject to the tenant's plan members limit. Mirrors POST /members.",
      inputSchema: CreateMemberSchema.shape,
    },
    async (dto) => {
      try {
        await assertMcpPermission(authCtx, "SETTINGS.MEMBERS.CREATE");
        await assertPlanLimitByTenantId(authCtx.tenantId, "members");
        const member = await memberService.create(
          authCtx.tenantId,
          dto as CreateMemberDto,
        );
        return mcpJsonResponse(member);
      } catch (err) {
        return mcpErrorResponse(err, "create_member failed");
      }
    },
  );
}
